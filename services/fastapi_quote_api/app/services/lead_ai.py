from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib import request as urllib_request
from urllib.error import URLError

from app.core.config import (
    AI_RUNTIME_TIMEOUT_SECONDS,
    AI_RUNTIME_URL,
    AUTOMATION_SHARED_SECRET,
    LEAD_AI_ENABLED,
    OPENAI_MODEL,
)
from app.core.db import get_db_connection
from app.core.observability import log_event
from app.services.activities import create_activity
from app.services.ai_logs import create_ai_log
from app.services.leads import get_lead_by_id
from app.services.slack import (
    notify_automation_error as notify_automation_error_slack,
    notify_hot_lead as notify_hot_lead_slack,
)
from app.services.telegram import (
    notify_automation_error as notify_automation_error_telegram,
    notify_hot_lead as notify_hot_lead_telegram,
)

ALLOWED_LEVELS = {"low", "medium", "high"}


def _log_event(event: str, **fields: Any) -> None:
    log_event(event, **fields)


def _normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_quantity(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        return None
    return quantity if quantity > 0 else None


def _normalize_level(value: Any) -> Optional[str]:
    normalized = _normalize_text(value)
    if not normalized:
        return None
    lowered = normalized.lower()
    return lowered if lowered in ALLOWED_LEVELS else None


def _normalize_provider_for_db(provider: Any) -> str:
    normalized = (_normalize_text(provider) or "system").lower()
    return "openai" if normalized == "openai" else "system"


class LeadAIService:
    def __init__(self) -> None:
        self.model = OPENAI_MODEL
        self.enabled = LEAD_AI_ENABLED

    def analyze_lead(self, lead_id: str) -> Dict[str, Any]:
        started_at = time.perf_counter()
        request_payload = {"leadId": lead_id, "model": self.model}
        _log_event("lead_ai_start", lead_id=lead_id, model=self.model)

        with get_db_connection() as connection:
            lead = get_lead_by_id(connection, lead_id)
            if not lead:
                raise ValueError("Lead not found.")

        heuristic = self._heuristic_analysis(lead)

        if not self.enabled:
            _log_event(
                "lead_ai_skipped",
                lead_id=lead_id,
                model=self.model,
                reason="lead_ai_disabled",
                provider="system",
            )
            self._persist_automation_run(
                status="cancelled",
                lead_id=lead_id,
                request_payload=request_payload,
                response_payload={"processed": True, "provider": "system", "reason": "lead_ai_disabled"},
                error_message="Lead AI processing is disabled. Heuristic system fallback used.",
            )
            result = {**heuristic, "provider": "system", "fallback_used": True}
            self._persist_lead_result(lead_id, result)
            create_ai_log(
                workflow_name="lead_ai_processing",
                status="cancelled",
                provider="system",
                model=self.model,
                trigger_entity_type="lead",
                trigger_entity_id=lead_id,
                fallback_used=True,
                input_payload=request_payload,
                output_payload=result,
                error_message="Lead AI processing is disabled. Heuristic system fallback used.",
                latency_ms=int((time.perf_counter() - started_at) * 1000),
            )
            return {"processed": True, "data": result}

        try:
            message = self._build_lead_message(lead)
            runtime_response = self._runtime_analysis(message, lead_id)
            response_payload = runtime_response.get("data") or {}
            runtime_provider = str(runtime_response.get("provider") or "system")
            runtime_fallback_used = bool(runtime_response.get("fallback_used", False))
            runtime_failure_reason = _normalize_text(runtime_response.get("failure_reason"))
            extracted = {
                "product": _normalize_text(response_payload.get("product")) or heuristic["product"],
                "quantity": _normalize_quantity(response_payload.get("quantity")) or heuristic["quantity"],
                "urgency": _normalize_level(response_payload.get("urgency")) or heuristic["urgency"],
                "complexity": _normalize_level(response_payload.get("complexity")) or heuristic["complexity"],
            }
            result = {
                **extracted,
                "ai_score": self._normalize_score(response_payload.get("ai_score")) or heuristic["ai_score"],
                "classification": self._normalize_classification(response_payload.get("classification"))
                or heuristic["classification"],
                "reasoning": self._normalize_reasoning(response_payload.get("reasoning"))
                or heuristic["reasoning"],
                "provider": runtime_provider,
                "source": runtime_response.get("source"),
                "fallback_used": runtime_fallback_used,
                "failure_reason": runtime_failure_reason,
            }

            self._persist_lead_result(lead_id, result)
            self._persist_automation_run(
                status="success",
                lead_id=lead_id,
                request_payload={**request_payload, "message": message},
                response_payload=result,
            )
            _log_event(
                "lead_ai_completed",
                lead_id=lead_id,
                model=self.model,
                processed=True,
                provider=runtime_provider,
                fallback_used=runtime_fallback_used,
                extracted=extracted,
                ai_score=result["ai_score"],
                classification=result["classification"],
            )
            if (result.get("classification") or "").upper() == "HOT":
                notify_hot_lead_slack(
                    lead_id=lead_id,
                    company_name=str(lead.get("company_name") or ""),
                    contact_name=str(lead.get("contact_name") or ""),
                    ai_score=result.get("ai_score"),
                )
                notify_hot_lead_telegram(
                    lead_id=lead_id,
                    company_name=str(lead.get("company_name") or ""),
                    contact_name=str(lead.get("contact_name") or ""),
                    ai_score=result.get("ai_score"),
                )
            create_ai_log(
                workflow_name="lead_ai_processing",
                status="success",
                provider=str(result.get("provider") or "system"),
                model=self.model,
                trigger_entity_type="lead",
                trigger_entity_id=lead_id,
                fallback_used=bool(result.get("fallback_used", False)),
                input_payload={**request_payload, "message": message},
                output_payload=result,
                error_message=runtime_failure_reason,
                latency_ms=int((time.perf_counter() - started_at) * 1000),
            )
            return {"processed": True, "data": result}
        except Exception as error:
            result = {
                **heuristic,
                "provider": "system",
                "source": "fallback",
                "fallback_used": True,
                "failure_reason": str(error),
            }
            _log_event(
                "lead_ai_failure",
                lead_id=lead_id,
                model=self.model,
                error=str(error),
                fallback_provider="system",
            )
            self._persist_lead_result(lead_id, result)
            self._persist_automation_run(
                status="failed",
                lead_id=lead_id,
                request_payload=request_payload,
                response_payload=result,
                error_message=str(error),
            )
            create_ai_log(
                workflow_name="lead_ai_processing",
                status="failed",
                provider="system",
                model=self.model,
                trigger_entity_type="lead",
                trigger_entity_id=lead_id,
                fallback_used=True,
                input_payload=request_payload,
                output_payload=result,
                error_message=str(error),
                latency_ms=int((time.perf_counter() - started_at) * 1000),
            )
            return {"processed": True, "data": result, "error": str(error)}

    def _build_lead_message(self, lead: Dict[str, Any]) -> str:
        parts = [
            f"Contact: {lead.get('contact_name') or 'Unknown'}",
            f"Company: {lead.get('company_name') or 'Unknown'}",
            f"Email: {lead.get('email') or 'Unknown'}",
            f"Phone: {lead.get('phone') or 'Unknown'}",
            f"Requested Quantity: {lead.get('requested_qty') or 'Unknown'}",
            f"Timeline Date: {lead.get('timeline_date') or 'Unknown'}",
            f"Notes: {lead.get('notes') or 'No notes'}",
        ]
        return "\n".join(parts)

    def _heuristic_analysis(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        notes = (lead.get("notes") or "").lower()
        requested_qty = _normalize_quantity(lead.get("requested_qty"))
        inferred_quantity = requested_qty
        reasoning: list[str] = []

        if inferred_quantity is None:
            match = re.search(r"\b(\d{1,6})\b", notes)
            if match:
                inferred_quantity = _normalize_quantity(match.group(1))

        timeline_raw = str(lead.get("timeline_date") or "").lower()
        urgency = "medium"
        if any(keyword in notes for keyword in ("urgent", "asap", "immediately", "next week")):
            urgency = "high"
            reasoning.append("Urgent language or near-term delivery mentioned")
        elif any(keyword in notes for keyword in ("whenever", "flexible", "later")):
            urgency = "low"
            reasoning.append("Flexible timing language detected")
        elif timeline_raw:
            urgency = "high"
            reasoning.append("Delivery date specified")

        quantity_for_complexity = inferred_quantity or 0
        complexity = "low"
        if quantity_for_complexity >= 500 or any(
            keyword in notes for keyword in ("embroidery", "multiple sizes", "custom", "branding", "logo")
        ):
            complexity = "high"
            reasoning.append("High customization or very large quantity")
        elif quantity_for_complexity >= 150 or any(
            keyword in notes for keyword in ("print", "polo", "uniform", "staff")
        ):
            complexity = "medium"
            reasoning.append("Moderate production requirements detected")

        product = None
        product_patterns = [
            (r"polo shirts?", "polo shirt"),
            (r"t-?shirts?", "t-shirt"),
            (r"hoodies?", "hoodie"),
            (r"uniforms?", "uniform"),
            (r"jackets?", "jacket"),
            (r"caps?", "cap"),
        ]
        for pattern, normalized in product_patterns:
            if re.search(pattern, notes):
                product = normalized
                break

        if not product:
            product = "garment"

        score = 35
        if quantity_for_complexity >= 1000:
            score += 30
            reasoning.append("Very high quantity")
        elif quantity_for_complexity >= 500:
            score += 22
            reasoning.append("High quantity")
        elif quantity_for_complexity >= 200:
            score += 14
            reasoning.append("Good quantity")
        elif quantity_for_complexity >= 100:
            score += 8
            reasoning.append("Meaningful order size")

        if lead.get("company_name"):
            score += 10
            reasoning.append("Company provided")

        if lead.get("timeline_date"):
            score += 8
            if "Delivery date specified" not in reasoning:
                reasoning.append("Delivery date specified")

        if any(keyword in notes for keyword in ("event", "conference", "campaign", "uniform", "staff")):
            score += 6
            reasoning.append("Business intent keywords detected")

        if lead.get("email") and lead.get("phone"):
            score += 4
            reasoning.append("Multiple contact methods provided")

        score = max(0, min(100, score))
        classification = "COLD"
        if score >= 75:
            classification = "HOT"
        elif score >= 55:
            classification = "WARM"

        return {
            "ai_score": score,
            "classification": classification,
            "reasoning": {
                "summary": ", ".join(reasoning) if reasoning else "Basic heuristic analysis applied",
                "signals": reasoning or ["Basic heuristic analysis applied"],
            },
            "product": product,
            "quantity": inferred_quantity,
            "urgency": urgency,
            "complexity": complexity,
        }

    def _runtime_analysis(self, message: str, lead_id: str) -> Dict[str, Any]:
        endpoint = f"{AI_RUNTIME_URL.rstrip('/')}/api/internal/ai/llm-runtime"
        payload = {
            "feature": "fastapi_lead_ai",
            "systemPrompt": (
                "You extract structured sales lead data from garment order inquiries. "
                "Determine lead seriousness and extract data from garment order inquiries. "
                "Return strict JSON with keys: ai_score, classification, reasoning, product, quantity, urgency, complexity. "
                "classification must be one of: HOT, WARM, COLD. "
                "Urgency must be one of: low, medium, high. "
                "Complexity must be one of: low, medium, high. "
                "reasoning must be an object with keys: summary, signals. "
                "signals must be an array of short strings that explain the score. "
                "If a value is missing or unclear, return null."
            ),
            "userInput": message,
            "schemaLabel": "LeadAIAnalysis",
            "schemaHint": (
                "{\"ai_score\":0,\"classification\":\"HOT|WARM|COLD\","
                "\"reasoning\":{\"summary\":\"string\",\"signals\":[\"string\"]},"
                "\"product\":\"string|null\",\"quantity\":0,\"urgency\":\"low|medium|high\","
                "\"complexity\":\"low|medium|high\"}"
            ),
            "fallbackReasonPrefix": "LeadAI:",
            "fallbackData": {},
        }
        headers = {"Content-Type": "application/json"}
        if AUTOMATION_SHARED_SECRET.strip():
            headers["x-automation-secret"] = AUTOMATION_SHARED_SECRET.strip()

        _log_event(
            "lead_ai_runtime_request",
            lead_id=lead_id,
            endpoint=endpoint,
            model=self.model,
        )
        req = urllib_request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib_request.urlopen(req, timeout=AI_RUNTIME_TIMEOUT_SECONDS) as response:
                body = response.read().decode("utf-8")
        except URLError as error:
            raise RuntimeError(f"AI runtime request failed: {error}") from error

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError as error:
            raise RuntimeError(f"Invalid AI runtime JSON response: {error}") from error

        if not isinstance(parsed, dict):
            raise RuntimeError("AI runtime response must be a JSON object.")

        if not parsed.get("ok", False):
            raise RuntimeError(str(parsed.get("message") or "AI runtime returned error."))

        data = parsed.get("data")
        if not isinstance(data, dict):
            raise RuntimeError("AI runtime response is missing object data payload.")

        _log_event(
            "lead_ai_runtime_success",
            lead_id=lead_id,
            endpoint=endpoint,
            parsed=True,
            keys=sorted(data.keys()),
        )
        return {
            "data": data,
            "provider": parsed.get("provider"),
            "source": parsed.get("source"),
            "model": parsed.get("model"),
            "fallback_used": parsed.get("fallbackUsed"),
            "failure_reason": parsed.get("failureReason"),
        }

    def _normalize_score(self, value: Any) -> Optional[int]:
        if value is None or value == "":
            return None
        try:
            score = int(value)
        except (TypeError, ValueError):
            return None
        return max(0, min(100, score))

    def _normalize_classification(self, value: Any) -> Optional[str]:
        normalized = _normalize_text(value)
        if not normalized:
            return None
        upper = normalized.upper()
        return upper if upper in {"HOT", "WARM", "COLD"} else None

    def _normalize_reasoning(self, value: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(value, dict):
            return None
        summary = _normalize_text(value.get("summary"))
        signals_raw = value.get("signals")
        signals: list[str] = []
        if isinstance(signals_raw, list):
            for item in signals_raw:
                normalized = _normalize_text(item)
                if normalized:
                    signals.append(normalized)
        if not summary and not signals:
            return None
        return {
            "summary": summary or ", ".join(signals),
            "signals": signals,
        }

    def _persist_lead_result(self, lead_id: str, result: Dict[str, Any]) -> None:
        reasoning_raw = result.get("reasoning") if isinstance(result.get("reasoning"), dict) else {}
        canonical_reasoning = {
            "summary": _normalize_text(reasoning_raw.get("summary"))
            or ", ".join(reasoning_raw.get("signals") or [])
            or "AI lead analysis completed.",
            "intent": "unknown",
            "urgency": _normalize_level(result.get("urgency")) or "low",
            "complexity": _normalize_level(result.get("complexity")) or "low",
            "quantity": _normalize_quantity(result.get("quantity")),
            "confidence": None,
            "score": self._normalize_score(result.get("ai_score")),
            "classification": ((_normalize_text(result.get("classification")) or "cold").lower()),
            "nextBestAction": (
                "Prepare and send a quote quickly, then follow up for blockers."
                if ((_normalize_text(result.get("classification")) or "").upper() == "HOT")
                else "Send a professional first reply and collect missing commercial details."
            ),
            "provider": _normalize_text(result.get("provider")) or "system",
            "source": _normalize_text(result.get("source")) or "fallback",
            "fallbackUsed": bool(result.get("fallback_used", False)),
            "failureReason": _normalize_text(result.get("failure_reason")),
            "processedAt": datetime.now(timezone.utc).isoformat(),
            "signals": reasoning_raw.get("signals") if isinstance(reasoning_raw.get("signals"), list) else [],
        }

        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE leads
                    SET
                      lead_score = %s,
                      ai_score = %s,
                      ai_classification = %s,
                      ai_reasoning = %s::jsonb,
                      ai_product = %s,
                      ai_quantity = %s,
                      ai_urgency = %s,
                      ai_complexity = %s,
                      ai_provider = %s,
                      ai_fallback_used = %s,
                      ai_processed_at = NOW(),
                      updated_at = NOW()
                    WHERE id = %s::uuid
                    """,
                    (
                        result.get("ai_score"),
                        result.get("ai_score"),
                        result.get("classification"),
                        json.dumps(canonical_reasoning),
                        result.get("product"),
                        result.get("quantity"),
                        result.get("urgency"),
                        result.get("complexity"),
                        _normalize_provider_for_db(result.get("provider")),
                        result.get("fallback_used", False),
                        lead_id,
                    ),
                )

                create_activity(
                    connection=connection,
                    activity_type="ai_processed_lead",
                    title="AI processed lead",
                    lead_id=lead_id,
                    details=f"LeadAIService processed lead using {result.get('provider', 'system')}.",
                    metadata=result,
                )
            connection.commit()

    def _persist_automation_run(
        self,
        status: str,
        lead_id: str,
        request_payload: Dict[str, Any],
        response_payload: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO automation_runs (
                        workflow_name,
                        trigger_source,
                        trigger_entity_type,
                        trigger_entity_id,
                        status,
                        request_payload,
                        response_payload,
                        error_message,
                        started_at,
                        finished_at
                    )
                    VALUES (%s, %s, %s, %s::uuid, %s, %s::jsonb, %s::jsonb, %s, %s, %s)
                    """,
                    (
                        "lead_ai_processing",
                        "lead_created",
                        "lead",
                        lead_id,
                        status,
                        json.dumps(request_payload),
                        json.dumps(response_payload or {}),
                        error_message,
                        now,
                        now,
                    ),
                )
            connection.commit()
        if status == "failed" and error_message:
            notify_automation_error_slack(
                workflow_name="lead_ai_processing",
                error_message=error_message,
                trigger_entity_type="lead",
                trigger_entity_id=lead_id,
            )
            notify_automation_error_telegram(
                workflow_name="lead_ai_processing",
                error_message=error_message,
                trigger_entity_type="lead",
                trigger_entity_id=lead_id,
            )


def process_lead_with_ai(lead_id: str) -> Dict[str, Any]:
    return LeadAIService().analyze_lead(lead_id)
