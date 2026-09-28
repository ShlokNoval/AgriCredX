"""
AgriCredX AI Service — Deterministic Rules Engine.

Cross-document verification checks that run AFTER AI extraction.
These are purely deterministic — no LLM involved. Each check
produces a PASS / WARN / FAIL with a human-readable explanation.

Checks implemented:
  1. AMOUNT_MATCH   — Invoice amount vs PO amount
  2. BUYER_MATCH    — Invoice buyer vs PO buyer
  3. QTY_MATCH      — Invoice/PO quantity vs GRN received quantity
  4. DATE_CONSISTENCY — PO date ≤ Invoice date ≤ GRN date
  5. DUPLICATE_ID   — Invoice ID not already active in the system
  6. DOCUMENT_HASH  — Uploaded hash matches recomputed hash

Risk scoring:
  - Each FAIL adds 25 points, each WARN adds 10 points.
  - Score 0-30 → LOW, 31-60 → MEDIUM, 61-100 → HIGH.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from app.models.verification import (
    RiskBand,
    VerificationCheck,
    VerificationCheckCode,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


def normalize_name(name: Optional[str]) -> str:
    """
    Normalize an entity name for fuzzy comparison.
    Strips whitespace, lowercases, removes common suffixes
    (Pvt, Ltd, Inc, LLC, etc.) and punctuation.
    """
    if not name:
        return ""
    n = name.strip().lower()
    # Remove common corporate suffixes
    n = re.sub(r"\b(pvt|private|ltd|limited|inc|llc|llp|co|corp|corporation)\b", "", n)
    # Remove punctuation and extra whitespace
    n = re.sub(r"[^\w\s]", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def normalize_amount(amount: Optional[float]) -> Optional[float]:
    """Round to 2 decimal places for comparison."""
    if amount is None:
        return None
    return round(float(amount), 2)


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse a date string in common formats."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


# -------------------------------------------------------
# Individual check functions
# -------------------------------------------------------

def check_amount_match(
    extractions: Dict[str, Dict[str, Any]],
) -> VerificationCheck:
    """Compare invoice amount with PO amount."""
    invoice = extractions.get("invoice", {})
    po = extractions.get("purchase_order", {})

    inv_amount = normalize_amount(invoice.get("invoiceAmount"))
    po_amount = normalize_amount(po.get("poAmount"))

    if inv_amount is None and po_amount is None:
        return VerificationCheck(
            code=VerificationCheckCode.AMOUNT_MATCH,
            status=VerificationStatus.WARN,
            explanation="Neither invoice amount nor PO amount could be extracted.",
        )

    if inv_amount is None:
        return VerificationCheck(
            code=VerificationCheckCode.AMOUNT_MATCH,
            status=VerificationStatus.WARN,
            extracted_value="N/A",
            expected_value=str(po_amount),
            explanation="Invoice amount could not be extracted for comparison.",
        )

    if po_amount is None:
        return VerificationCheck(
            code=VerificationCheckCode.AMOUNT_MATCH,
            status=VerificationStatus.WARN,
            extracted_value=str(inv_amount),
            expected_value="N/A",
            explanation="PO amount could not be extracted for comparison.",
        )

    if inv_amount == po_amount:
        return VerificationCheck(
            code=VerificationCheckCode.AMOUNT_MATCH,
            status=VerificationStatus.PASS,
            extracted_value=str(inv_amount),
            expected_value=str(po_amount),
            explanation=f"Invoice and PO amount match at INR {inv_amount:,.2f}.",
        )
    else:
        return VerificationCheck(
            code=VerificationCheckCode.AMOUNT_MATCH,
            status=VerificationStatus.FAIL,
            extracted_value=str(inv_amount),
            expected_value=str(po_amount),
            explanation=(
                f"Invoice amount INR {inv_amount:,.2f} does NOT match "
                f"PO amount INR {po_amount:,.2f}."
            ),
        )


def check_buyer_match(
    extractions: Dict[str, Dict[str, Any]],
) -> VerificationCheck:
    """Compare buyer name across invoice and PO."""
    invoice = extractions.get("invoice", {})
    po = extractions.get("purchase_order", {})

    inv_buyer = normalize_name(invoice.get("buyerName"))
    po_buyer = normalize_name(po.get("buyerName"))

    if not inv_buyer and not po_buyer:
        return VerificationCheck(
            code=VerificationCheckCode.BUYER_MATCH,
            status=VerificationStatus.WARN,
            explanation="Buyer name could not be extracted from either document.",
        )

    if not inv_buyer:
        return VerificationCheck(
            code=VerificationCheckCode.BUYER_MATCH,
            status=VerificationStatus.WARN,
            extracted_value="N/A",
            expected_value=po_buyer,
            explanation="Buyer name not found in invoice.",
        )

    if not po_buyer:
        return VerificationCheck(
            code=VerificationCheckCode.BUYER_MATCH,
            status=VerificationStatus.WARN,
            extracted_value=inv_buyer,
            expected_value="N/A",
            explanation="Buyer name not found in PO.",
        )

    # Fuzzy match: check if one contains the other
    if inv_buyer == po_buyer or inv_buyer in po_buyer or po_buyer in inv_buyer:
        return VerificationCheck(
            code=VerificationCheckCode.BUYER_MATCH,
            status=VerificationStatus.PASS,
            extracted_value=invoice.get("buyerName", ""),
            expected_value=po.get("buyerName", ""),
            explanation=f"Invoice buyer '{invoice.get('buyerName')}' matches PO buyer.",
        )
    else:
        return VerificationCheck(
            code=VerificationCheckCode.BUYER_MATCH,
            status=VerificationStatus.FAIL,
            extracted_value=invoice.get("buyerName", ""),
            expected_value=po.get("buyerName", ""),
            explanation=(
                f"Invoice buyer '{invoice.get('buyerName')}' does NOT match "
                f"PO buyer '{po.get('buyerName')}'."
            ),
        )


def check_qty_match(
    extractions: Dict[str, Dict[str, Any]],
) -> VerificationCheck:
    """Compare quantities across invoice/PO and GRN."""
    invoice = extractions.get("invoice", {})
    grn = extractions.get("grn", {})

    inv_qty = invoice.get("quantity")
    grn_qty = grn.get("receivedQuantity")

    if inv_qty is None and grn_qty is None:
        return VerificationCheck(
            code=VerificationCheckCode.QTY_MATCH,
            status=VerificationStatus.WARN,
            explanation="Quantity could not be extracted from invoice or GRN.",
        )

    if inv_qty is None:
        return VerificationCheck(
            code=VerificationCheckCode.QTY_MATCH,
            status=VerificationStatus.WARN,
            extracted_value="N/A",
            expected_value=str(grn_qty),
            explanation="Invoice quantity not available for comparison.",
        )

    if grn_qty is None:
        return VerificationCheck(
            code=VerificationCheckCode.QTY_MATCH,
            status=VerificationStatus.WARN,
            extracted_value=str(inv_qty),
            expected_value="N/A",
            explanation="GRN quantity not available for comparison.",
        )

    if float(inv_qty) == float(grn_qty):
        return VerificationCheck(
            code=VerificationCheckCode.QTY_MATCH,
            status=VerificationStatus.PASS,
            extracted_value=str(inv_qty),
            expected_value=str(grn_qty),
            explanation=f"Invoice quantity {inv_qty} matches GRN received quantity.",
        )
    else:
        return VerificationCheck(
            code=VerificationCheckCode.QTY_MATCH,
            status=VerificationStatus.FAIL,
            extracted_value=str(inv_qty),
            expected_value=str(grn_qty),
            explanation=(
                f"Invoice quantity {inv_qty} does NOT match "
                f"GRN received quantity {grn_qty}."
            ),
        )


def check_date_consistency(
    extractions: Dict[str, Dict[str, Any]],
) -> VerificationCheck:
    """
    Verify date ordering: PO date ≤ Invoice date ≤ GRN date.
    """
    invoice = extractions.get("invoice", {})
    po = extractions.get("purchase_order", {})
    grn = extractions.get("grn", {})

    inv_date = parse_date(invoice.get("invoiceDate"))
    po_date = parse_date(po.get("poDate"))
    grn_date = parse_date(grn.get("grnDate"))

    dates_found = sum(1 for d in [po_date, inv_date, grn_date] if d is not None)

    if dates_found < 2:
        return VerificationCheck(
            code=VerificationCheckCode.DATE_CONSISTENCY,
            status=VerificationStatus.WARN,
            explanation=(
                f"Only {dates_found} of 3 dates could be extracted. "
                f"Cannot fully verify date consistency."
            ),
        )

    issues = []

    if po_date and inv_date and po_date > inv_date:
        issues.append(
            f"PO date ({po_date.date()}) is AFTER invoice date ({inv_date.date()})"
        )

    if inv_date and grn_date and inv_date > grn_date:
        issues.append(
            f"Invoice date ({inv_date.date()}) is AFTER GRN date ({grn_date.date()})"
        )

    if po_date and grn_date and po_date > grn_date:
        issues.append(
            f"PO date ({po_date.date()}) is AFTER GRN date ({grn_date.date()})"
        )

    if issues:
        return VerificationCheck(
            code=VerificationCheckCode.DATE_CONSISTENCY,
            status=VerificationStatus.FAIL,
            explanation="Date ordering violation: " + "; ".join(issues) + ".",
        )

    return VerificationCheck(
        code=VerificationCheckCode.DATE_CONSISTENCY,
        status=VerificationStatus.PASS,
        explanation="Date ordering is consistent: PO ≤ Invoice ≤ GRN.",
    )


def check_duplicate_id(
    extractions: Dict[str, Dict[str, Any]],
    existing_invoice_ids: Optional[Set[str]] = None,
) -> VerificationCheck:
    """
    Check if the invoice ID already exists in the system.
    The set of existing IDs is passed in by the caller
    (fetched from Supabase before calling the rules engine).
    """
    invoice = extractions.get("invoice", {})
    invoice_id = invoice.get("invoiceNumber")

    if not invoice_id:
        return VerificationCheck(
            code=VerificationCheckCode.DUPLICATE_ID,
            status=VerificationStatus.WARN,
            explanation="Invoice number could not be extracted for duplicate check.",
        )

    if existing_invoice_ids and invoice_id in existing_invoice_ids:
        return VerificationCheck(
            code=VerificationCheckCode.DUPLICATE_ID,
            status=VerificationStatus.FAIL,
            extracted_value=invoice_id,
            explanation=(
                f"Invoice ID '{invoice_id}' already exists in the system. "
                f"Possible duplicate financing attempt."
            ),
        )

    return VerificationCheck(
        code=VerificationCheckCode.DUPLICATE_ID,
        status=VerificationStatus.PASS,
        extracted_value=invoice_id,
        explanation=f"Invoice ID '{invoice_id}' is not a duplicate.",
    )


def check_document_hash(
    expected_hashes: Dict[str, str],
    actual_hashes: Dict[str, str],
) -> VerificationCheck:
    """
    Compare expected SHA-256 hashes (from upload time) with
    hashes recomputed from the downloaded document bytes.
    """
    mismatches = []
    for doc_type, expected in expected_hashes.items():
        actual = actual_hashes.get(doc_type)
        if actual and actual != expected:
            mismatches.append(
                f"{doc_type}: expected {expected[:12]}…, got {actual[:12]}…"
            )

    if mismatches:
        return VerificationCheck(
            code=VerificationCheckCode.DOCUMENT_HASH,
            status=VerificationStatus.FAIL,
            explanation=(
                "Document integrity mismatch detected: "
                + "; ".join(mismatches)
                + ". Documents may have been tampered with."
            ),
        )

    return VerificationCheck(
        code=VerificationCheckCode.DOCUMENT_HASH,
        status=VerificationStatus.PASS,
        explanation="All document hashes are consistent with uploaded originals.",
    )


# -------------------------------------------------------
# Risk score computation
# -------------------------------------------------------

def compute_risk_score(checks: List[VerificationCheck]) -> tuple[int, RiskBand]:
    """
    Compute risk score from check results.

    Scoring:
      - Each FAIL: +25 points
      - Each WARN: +10 points
      - Each PASS: +0 points
      - Capped at 100

    Bands:
      - 0-30: LOW
      - 31-60: MEDIUM
      - 61-100: HIGH
    """
    score = 0
    for check in checks:
        if check.status == VerificationStatus.FAIL:
            score += 25
        elif check.status == VerificationStatus.WARN:
            score += 10

    score = min(score, 100)

    if score <= 30:
        band = RiskBand.LOW
    elif score <= 60:
        band = RiskBand.MEDIUM
    else:
        band = RiskBand.HIGH

    return score, band


# -------------------------------------------------------
# Main entry point
# -------------------------------------------------------

def run_all_checks(
    extractions: Dict[str, Dict[str, Any]],
    expected_hashes: Dict[str, str],
    actual_hashes: Dict[str, str],
    existing_invoice_ids: Optional[Set[str]] = None,
) -> tuple[List[VerificationCheck], int, RiskBand]:
    """
    Run all deterministic verification checks.

    Args:
        extractions: Map of document_type → extracted fields dict.
        expected_hashes: Map of document_type → expected SHA-256 hash.
        actual_hashes: Map of document_type → recomputed SHA-256 hash.
        existing_invoice_ids: Set of invoice IDs already in the system.

    Returns:
        Tuple of (checks, risk_score, risk_band).
    """
    checks = [
        check_amount_match(extractions),
        check_buyer_match(extractions),
        check_qty_match(extractions),
        check_date_consistency(extractions),
        check_duplicate_id(extractions, existing_invoice_ids),
        check_document_hash(expected_hashes, actual_hashes),
    ]

    score, band = compute_risk_score(checks)

    logger.info(
        f"Verification complete: {score}/100 ({band.value}) — "
        f"PASS={sum(1 for c in checks if c.status == VerificationStatus.PASS)}, "
        f"WARN={sum(1 for c in checks if c.status == VerificationStatus.WARN)}, "
        f"FAIL={sum(1 for c in checks if c.status == VerificationStatus.FAIL)}"
    )

    return checks, score, band
