"""
AgriCredX AI Service — Verification Endpoint.

Full pipeline:
  1. Download each document PDF from signed URL
  2. Extract text via PyMuPDF
  3. Compute SHA-256 and compare with expected hash
  4. Send text to Gemini for structured field extraction
  5. Run deterministic cross-document checks (rules engine)
  6. Compute risk score and band
  7. Return typed VerificationResponse
"""

import logging
from typing import Any, Dict, Set

from fastapi import APIRouter, HTTPException

from app.extractors.pdf_extractor import extract_text_from_url
from app.llm.gemini_client import extract_fields
from app.models.verification import (
    RiskBand,
    VerificationCheck,
    VerificationRequest,
    VerificationResponse,
    VerificationStatus,
)
from app.rules.engine import run_all_checks

logger = logging.getLogger(__name__)

router = APIRouter()

ENGINE_VERSION = "v1"


@router.post("/verify", response_model=VerificationResponse)
async def verify_documents(request: VerificationRequest):
    """
    Verify a set of documents for a receivable.

    Accepts a list of documents (with signed URLs and expected hashes),
    extracts text, runs AI extraction, performs deterministic checks,
    and returns a risk-scored verification report.
    """
    logger.info(
        f"Verification request for receivable {request.receivable_id} "
        f"with {len(request.documents)} documents"
    )

    # -------------------------------------------------------
    # Step 1 & 2: Download and extract text from each document
    # -------------------------------------------------------
    extractions: Dict[str, Dict[str, Any]] = {}
    expected_hashes: Dict[str, str] = {}
    actual_hashes: Dict[str, str] = {}

    for doc in request.documents:
        doc_type = doc.type.value
        expected_hashes[doc_type] = doc.sha256

        try:
            # Download PDF and extract text, get actual hash
            text, actual_sha256 = extract_text_from_url(
                url=doc.url,
                expected_sha256=doc.sha256,
            )
            actual_hashes[doc_type] = actual_sha256

            logger.info(
                f"Extracted {len(text)} chars from {doc_type} "
                f"(hash match: {actual_sha256 == doc.sha256})"
            )

            # -------------------------------------------------------
            # Step 3: AI structured extraction via Gemini
            # -------------------------------------------------------
            extracted = await extract_fields(
                document_type=doc_type,
                text=text,
            )
            extractions[doc_type] = extracted

            logger.info(f"Gemini extraction for {doc_type}: {list(extracted.keys())}")

        except Exception as e:
            logger.error(f"Failed to process {doc_type}: {e}")
            # Store an empty extraction so checks can flag it as WARN
            extractions[doc_type] = {"confidence": 0.0}
            actual_hashes[doc_type] = ""

    # -------------------------------------------------------
    # Step 4: Run deterministic rules engine
    # -------------------------------------------------------
    # TODO: In production, fetch existing invoice IDs from Supabase
    # to enable the DUPLICATE_ID check. For now, pass an empty set.
    existing_invoice_ids: Set[str] = set()

    checks, risk_score, risk_band = run_all_checks(
        extractions=extractions,
        expected_hashes=expected_hashes,
        actual_hashes=actual_hashes,
        existing_invoice_ids=existing_invoice_ids,
    )

    # -------------------------------------------------------
    # Step 5: Build merged extracted fields for the response
    # -------------------------------------------------------
    merged_fields: Dict[str, Any] = {}
    for doc_type, fields in extractions.items():
        for key, value in fields.items():
            if value is not None:
                merged_fields[f"{doc_type}.{key}"] = value

    # -------------------------------------------------------
    # Step 6: Return typed response
    # -------------------------------------------------------
    response = VerificationResponse(
        risk_score=risk_score,
        risk_band=risk_band,
        checks=checks,
        extracted_fields=merged_fields,
        engine_version=ENGINE_VERSION,
    )

    logger.info(
        f"Verification complete for {request.receivable_id}: "
        f"{risk_score}/100 ({risk_band.value})"
    )

    return response


@router.post("/extract/{document_type}")
async def extract_single_document(document_type: str, url: str, sha256: str = ""):
    """
    Extract fields from a single document.
    Utility endpoint for testing extraction without full verification.
    """
    valid_types = {"invoice", "purchase_order", "grn", "quality_certificate", "lab_report"}
    if document_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type: {document_type}. Must be one of {valid_types}",
        )

    try:
        text, actual_hash = extract_text_from_url(url, sha256 or None)
        extracted = await extract_fields(document_type, text)
        return {
            "type": document_type,
            "sha256": actual_hash,
            "hash_match": actual_hash == sha256 if sha256 else None,
            "extracted": extracted,
            "text_length": len(text),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
