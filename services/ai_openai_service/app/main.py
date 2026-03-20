from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional
from urllib import request as urllib_request
from urllib.error import URLError

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

AI_SERVICE_AUTH_TOKEN = os.getenv("AI_SERVICE_AUTH_TOKEN", "").strip()
STOREFRONT_INTERNAL_URL = os.getenv("STOREFRONT_INTERNAL_URL", "http://storefront:3000").strip()
AUTOMATION_SHARED_SECRET = os.getenv("AUTOMATION_SHARED_SECRET", "").strip()
AI_RUNTIME_TIMEOUT_SECONDS = float(os.getenv("AI_RUNTIME_TIMEOUT_SECONDS", "30"))

app = FastAPI(title="Dubai Garments AI OpenAI Service", version="0.1.0")


class LeadAiAnalyzeRequest(BaseModel):
  lead_id: Optional[str] = None
  model: Optional[str] = None
  message: str = Field(min_length=3)


@app.get("/health")
def health():
  return {"status": "ok", "service": "ai_openai_service"}


@app.post("/api/v1/lead-ai/analyze")
def analyze_lead(
  payload: LeadAiAnalyzeRequest,
  x_ai_service_token: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
  if AI_SERVICE_AUTH_TOKEN and x_ai_service_token != AI_SERVICE_AUTH_TOKEN:
    raise HTTPException(status_code=401, detail="Unauthorized AI service token.")

  endpoint = f"{STOREFRONT_INTERNAL_URL.rstrip('/')}/api/internal/ai/llm-runtime"
  body = {
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
    "userInput": payload.message,
    "schemaLabel": "LeadAIAnalysis",
    "schemaHint": (
      "{\"ai_score\":0,\"classification\":\"HOT|WARM|COLD\","
      "\"reasoning\":{\"summary\":\"string\",\"signals\":[\"string\"]},"
      "\"product\":\"string|null\",\"quantity\":0,\"urgency\":\"low|medium|high\","
      "\"complexity\":\"low|medium|high\"}"
    ),
    "fallbackReasonPrefix": "LeadAIService:",
    "fallbackData": {},
  }
  headers = {"Content-Type": "application/json"}
  if AUTOMATION_SHARED_SECRET:
    headers["x-automation-secret"] = AUTOMATION_SHARED_SECRET

  req = urllib_request.Request(
    endpoint,
    data=json.dumps(body).encode("utf-8"),
    headers=headers,
    method="POST",
  )
  try:
    with urllib_request.urlopen(req, timeout=AI_RUNTIME_TIMEOUT_SECONDS) as response:
      raw = response.read().decode("utf-8")
  except URLError as error:
    raise HTTPException(status_code=502, detail=f"Runtime request failed: {error}") from error

  try:
    parsed = json.loads(raw)
  except json.JSONDecodeError as error:
    raise HTTPException(status_code=502, detail=f"Invalid JSON from runtime: {error}") from error

  if not isinstance(parsed, dict) or not parsed.get("ok", False):
    raise HTTPException(status_code=502, detail=str(parsed.get("message") if isinstance(parsed, dict) else "Runtime error"))

  data = parsed.get("data")
  if not isinstance(data, dict):
    raise HTTPException(status_code=502, detail="Runtime response was not a JSON object payload.")

  return data
