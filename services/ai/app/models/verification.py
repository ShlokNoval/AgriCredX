"""
AgriCredX AI Service — Verification request/response schemas.

These match the VerificationRequest / VerificationResponse contracts
defined in packages/shared-types/src/verification.ts.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum


class DocumentType(str, Enum):
    invoice = "invoice"
    purchase_order = "purchase_order"
    grn = "grn"
    quality_certificate = "quality_certificate"
    lab_report = "lab_report"


class DocumentInfo(BaseModel):
    """A single document reference in the verification request."""
    type: DocumentType
    url: str
    sha256: str


class VerificationRequest(BaseModel):
    """Inbound request from the Edge Function."""
    receivable_id: str
    documents: List[DocumentInfo]

    model_config = {"populate_by_name": True}


class VerificationStatus(str, Enum):
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"


class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class VerificationCheckCode(str, Enum):
    """Canonical check codes matching shared-types."""
    AMOUNT_MATCH = "AMOUNT_MATCH"
    BUYER_MATCH = "BUYER_MATCH"
    QTY_MATCH = "QTY_MATCH"
    DATE_CONSISTENCY = "DATE_CONSISTENCY"
    DUPLICATE_ID = "DUPLICATE_ID"
    DOCUMENT_HASH = "DOCUMENT_HASH"


class VerificationCheck(BaseModel):
    """A single verification check result."""
    code: str
    status: VerificationStatus
    extracted_value: Optional[str] = None
    expected_value: Optional[str] = None
    explanation: str

    model_config = {"populate_by_name": True}


class VerificationResponse(BaseModel):
    """Outbound response to the Edge Function."""
    risk_score: int
    risk_band: RiskBand
    checks: List[VerificationCheck]
    extracted_fields: Dict[str, Any]
    engine_version: str = "v1"

    model_config = {"populate_by_name": True}
