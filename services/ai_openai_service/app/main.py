from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
AI_SERVICE_AUTH_TOKEN = os.getenv("AI_SERVICE_AUTH_TOKEN", "").strip()

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

  if not OPENAI_API_KEY:
    raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

  model = payload.model or OPENAI_MODEL

  from openai import OpenAI

  client = OpenAI(api_key=OPENAI_API_KEY)
  completion = client.chat.completions.create(
    model=model,
    response_format={"type": "json_object"},
    temperature=0,
    messages=[
      {
        "role": "system",
        "content": (
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
      },
      {"role": "user", "content": payload.message},
    ],
  )

  content = completion.choices[0].message.content if completion.choices else None
  if not content:
    return {}

  try:
    parsed = json.loads(content)
  except json.JSONDecodeError as error:
    raise HTTPException(status_code=502, detail=f"Invalid JSON from OpenAI: {error}") from error

  if not isinstance(parsed, dict):
    raise HTTPException(status_code=502, detail="OpenAI response was not a JSON object.")

  return parsed
