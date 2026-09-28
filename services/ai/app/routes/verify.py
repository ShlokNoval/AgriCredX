from fastapi import APIRouter
from app.models import VerificationRequest, VerificationResponse, RiskBand

router = APIRouter()

@router.post("/verify", response_model=VerificationResponse)
async def verify_documents(request: VerificationRequest):
    # This is a skeleton for the bootstrap phase.
    # The actual implementation will use PyMuPDF, OCR fallback, and Gemini.
    
    return VerificationResponse(
        riskScore=15,
        riskBand=RiskBand.LOW,
        checks=[],
        extractedFields={},
        engineVersion="0.1.0-bootstrap"
    )
