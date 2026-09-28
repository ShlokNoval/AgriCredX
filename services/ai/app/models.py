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
    type: DocumentType
    url: str
    sha256: str

class VerificationRequest(BaseModel):
    receivableId: str
    documents: List[DocumentInfo]

class VerificationStatus(str, Enum):
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"

class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class VerificationCheck(BaseModel):
    code: str
    status: VerificationStatus
    extractedValue: Optional[str] = None
    expectedValue: Optional[str] = None
    explanation: str

class VerificationResponse(BaseModel):
    riskScore: int
    riskBand: RiskBand
    checks: List[VerificationCheck]
    extractedFields: Dict[str, Any]
    engineVersion: str
