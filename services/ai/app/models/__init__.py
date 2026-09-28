"""
AgriCredX AI Service — Pydantic Extraction Schemas.

These mirror the TypeScript interfaces in packages/document-schemas/src/index.ts
exactly, ensuring type parity between the Python AI service and the frontend.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict


class InvoiceExtraction(BaseModel):
    """Fields extracted from an Invoice PDF."""
    invoice_number: str = Field(..., alias="invoiceNumber")
    invoice_date: Optional[str] = Field(None, alias="invoiceDate")
    supplier_name: Optional[str] = Field(None, alias="supplierName")
    buyer_name: Optional[str] = Field(None, alias="buyerName")
    invoice_amount: Optional[float] = Field(None, alias="invoiceAmount")
    currency: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    commodity: Optional[str] = None
    payment_term_days: Optional[int] = Field(None, alias="paymentTermDays")
    due_date: Optional[str] = Field(None, alias="dueDate")
    confidence: float = 0.0

    model_config = {"populate_by_name": True}


class PurchaseOrderExtraction(BaseModel):
    """Fields extracted from a Purchase Order PDF."""
    po_number: str = Field(..., alias="poNumber")
    po_date: Optional[str] = Field(None, alias="poDate")
    buyer_name: Optional[str] = Field(None, alias="buyerName")
    supplier_name: Optional[str] = Field(None, alias="supplierName")
    po_amount: Optional[float] = Field(None, alias="poAmount")
    currency: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    commodity: Optional[str] = None
    delivery_date: Optional[str] = Field(None, alias="deliveryDate")
    confidence: float = 0.0

    model_config = {"populate_by_name": True}


class GRNExtraction(BaseModel):
    """Fields extracted from a GRN / Delivery Proof PDF."""
    grn_number: Optional[str] = Field(None, alias="grnNumber")
    grn_date: Optional[str] = Field(None, alias="grnDate")
    received_quantity: Optional[float] = Field(None, alias="receivedQuantity")
    unit: Optional[str] = None
    commodity: Optional[str] = None
    supplier_name: Optional[str] = Field(None, alias="supplierName")
    buyer_name: Optional[str] = Field(None, alias="buyerName")
    delivery_location: Optional[str] = Field(None, alias="deliveryLocation")
    condition: Optional[str] = None
    confidence: float = 0.0

    model_config = {"populate_by_name": True}


class QualityCertificateExtraction(BaseModel):
    """Fields extracted from a Quality Certificate PDF."""
    certificate_number: Optional[str] = Field(None, alias="certificateNumber")
    issue_date: Optional[str] = Field(None, alias="issueDate")
    issuing_authority: Optional[str] = Field(None, alias="issuingAuthority")
    commodity: Optional[str] = None
    grade: Optional[str] = None
    parameters: Optional[Dict[str, str]] = None
    result: Optional[str] = None
    confidence: float = 0.0

    model_config = {"populate_by_name": True}


class LabReportExtraction(BaseModel):
    """Fields extracted from a Lab Report PDF."""
    report_number: Optional[str] = Field(None, alias="reportNumber")
    report_date: Optional[str] = Field(None, alias="reportDate")
    laboratory: Optional[str] = None
    commodity: Optional[str] = None
    test_results: Optional[Dict[str, str]] = Field(None, alias="testResults")
    overall_result: Optional[str] = Field(None, alias="overallResult")
    confidence: float = 0.0

    model_config = {"populate_by_name": True}


# -------------------------------------------------------
# Union mapping: document_type → extraction model
# -------------------------------------------------------
EXTRACTION_MODEL_MAP = {
    "invoice": InvoiceExtraction,
    "purchase_order": PurchaseOrderExtraction,
    "grn": GRNExtraction,
    "quality_certificate": QualityCertificateExtraction,
    "lab_report": LabReportExtraction,
}
