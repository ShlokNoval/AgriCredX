"""
AgriCredX AI Service — Grok LLM Structured Extraction.

Sends extracted PDF text to Grok (xAI) and receives back
structured JSON matching our Pydantic extraction schemas.
"""

import json
import logging
import os
import urllib.request
import urllib.error
from typing import Any, Dict

from dotenv import load_dotenv
from app.models import (
    EXTRACTION_MODEL_MAP,
    InvoiceExtraction,
    PurchaseOrderExtraction,
    GRNExtraction,
    QualityCertificateExtraction,
    LabReportExtraction,
)

# Import the prompts and fallback from gemini_client to avoid duplication
from app.llm.gemini_client import SYSTEM_PROMPT, EXTRACTION_PROMPTS, _fallback_extract

load_dotenv()
logger = logging.getLogger(__name__)

# Configure Grok
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-beta")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"

async def extract_fields(
    document_type: str,
    text: str,
) -> Dict[str, Any]:
    """
    Send extracted text to Grok and get back structured fields.
    """
    if document_type not in EXTRACTION_PROMPTS:
        raise ValueError(f"Unknown document type: {document_type}")

    prompt = EXTRACTION_PROMPTS[document_type] + text

    if not GROK_API_KEY:
        logger.warning("GROK_API_KEY not set — using fallback extraction")
        return _fallback_extract(document_type, text)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROK_API_KEY}"
    }

    payload = {
        "model": GROK_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
    }

    try:
        req = urllib.request.Request(
            GROK_API_URL, 
            data=json.dumps(payload).encode('utf-8'), 
            headers=headers, 
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            response_body = response.read().decode('utf-8')
            response_data = json.loads(response_body)

        raw_json = response_data['choices'][0]['message']['content'].strip()

        # Strip markdown fences if the model wraps the output
        if raw_json.startswith("```"):
            raw_json = raw_json.split("\n", 1)[1]
            if raw_json.endswith("```"):
                raw_json = raw_json[: raw_json.rfind("```")]
            raw_json = raw_json.strip()

        parsed = json.loads(raw_json)

        # Validate against the Pydantic model
        model_cls = EXTRACTION_MODEL_MAP[document_type]
        validated = model_cls.model_validate(parsed)

        # Return camelCase-keyed dict for frontend compatibility
        return validated.model_dump(by_alias=True)

    except (urllib.error.HTTPError, json.JSONDecodeError) as e:
        logger.error(f"Grok extraction failed or returned invalid JSON: {e}")
        # Fall back to basic extraction
        return _fallback_extract(document_type, text)
    except Exception as e:
        logger.error(f"Grok request failed: {e}")
        return _fallback_extract(document_type, text)
