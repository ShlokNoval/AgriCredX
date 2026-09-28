"""
Unit tests for the AgriCredX deterministic rules engine.

Tests the 6 verification checks with known inputs matching
the canonical Basmati Rice scenario (INV-2026-09124).
"""

import pytest
from app.rules.engine import (
    check_amount_match,
    check_buyer_match,
    check_date_consistency,
    check_document_hash,
    check_duplicate_id,
    check_qty_match,
    compute_risk_score,
    normalize_name,
    run_all_checks,
)
from app.models.verification import RiskBand, VerificationStatus


# -------------------------------------------------------
# Canonical demo extractions (happy path)
# -------------------------------------------------------
CANONICAL_EXTRACTIONS = {
    "invoice": {
        "invoiceNumber": "INV-2026-09124",
        "invoiceDate": "2026-09-20",
        "supplierName": "Demo Basmati Exporter",
        "buyerName": "ABC Foods",
        "invoiceAmount": 850000.00,
        "currency": "INR",
        "quantity": 5000,
        "unit": "kg",
        "commodity": "Basmati Rice",
        "paymentTermDays": 60,
        "confidence": 0.95,
    },
    "purchase_order": {
        "poNumber": "PO-2026-4501",
        "poDate": "2026-09-18",
        "buyerName": "ABC Foods",
        "supplierName": "Demo Basmati Exporter",
        "poAmount": 850000.00,
        "currency": "INR",
        "quantity": 5000,
        "unit": "kg",
        "commodity": "Basmati Rice",
        "confidence": 0.93,
    },
    "grn": {
        "grnNumber": "GRN-2026-7890",
        "grnDate": "2026-09-22",
        "receivedQuantity": 5000,
        "unit": "kg",
        "commodity": "Basmati Rice",
        "supplierName": "Demo Basmati Exporter",
        "buyerName": "ABC Foods",
        "confidence": 0.90,
    },
}

CANONICAL_HASHES = {
    "invoice": "a1b2c3d4e5f6",
    "purchase_order": "c3d4e5f6a1b2",
    "grn": "e5f6a1b2c3d4",
}


class TestNormalizeName:
    def test_basic(self):
        assert normalize_name("ABC Foods") == "abc foods"

    def test_corporate_suffix(self):
        assert normalize_name("ABC Foods Pvt. Ltd.") == "abc foods"

    def test_none(self):
        assert normalize_name(None) == ""

    def test_whitespace(self):
        assert normalize_name("  ABC   Foods  ") == "abc foods"


class TestAmountMatch:
    def test_pass(self):
        result = check_amount_match(CANONICAL_EXTRACTIONS)
        assert result.status == VerificationStatus.PASS

    def test_fail_mismatch(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["invoice"] = {**modified["invoice"], "invoiceAmount": 950000.00}
        result = check_amount_match(modified)
        assert result.status == VerificationStatus.FAIL

    def test_warn_missing_po(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["purchase_order"] = {**modified["purchase_order"], "poAmount": None}
        result = check_amount_match(modified)
        assert result.status == VerificationStatus.WARN


class TestBuyerMatch:
    def test_pass(self):
        result = check_buyer_match(CANONICAL_EXTRACTIONS)
        assert result.status == VerificationStatus.PASS

    def test_fail_mismatch(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["invoice"] = {**modified["invoice"], "buyerName": "XYZ Corp"}
        result = check_buyer_match(modified)
        assert result.status == VerificationStatus.FAIL

    def test_pass_fuzzy(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["invoice"] = {**modified["invoice"], "buyerName": "ABC Foods Pvt Ltd"}
        result = check_buyer_match(modified)
        assert result.status == VerificationStatus.PASS


class TestQtyMatch:
    def test_pass(self):
        result = check_qty_match(CANONICAL_EXTRACTIONS)
        assert result.status == VerificationStatus.PASS

    def test_fail_mismatch(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["grn"] = {**modified["grn"], "receivedQuantity": 4500}
        result = check_qty_match(modified)
        assert result.status == VerificationStatus.FAIL


class TestDateConsistency:
    def test_pass(self):
        result = check_date_consistency(CANONICAL_EXTRACTIONS)
        assert result.status == VerificationStatus.PASS

    def test_fail_po_after_invoice(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["purchase_order"] = {**modified["purchase_order"], "poDate": "2026-09-25"}
        result = check_date_consistency(modified)
        assert result.status == VerificationStatus.FAIL


class TestDuplicateId:
    def test_pass_no_existing(self):
        result = check_duplicate_id(CANONICAL_EXTRACTIONS, set())
        assert result.status == VerificationStatus.PASS

    def test_fail_duplicate(self):
        result = check_duplicate_id(CANONICAL_EXTRACTIONS, {"INV-2026-09124"})
        assert result.status == VerificationStatus.FAIL


class TestDocumentHash:
    def test_pass(self):
        result = check_document_hash(CANONICAL_HASHES, CANONICAL_HASHES)
        assert result.status == VerificationStatus.PASS

    def test_fail_tampered(self):
        tampered = {**CANONICAL_HASHES, "invoice": "tampered_hash_value"}
        result = check_document_hash(CANONICAL_HASHES, tampered)
        assert result.status == VerificationStatus.FAIL


class TestRiskScore:
    def test_all_pass(self):
        checks = [
            check_amount_match(CANONICAL_EXTRACTIONS),
            check_buyer_match(CANONICAL_EXTRACTIONS),
            check_qty_match(CANONICAL_EXTRACTIONS),
            check_date_consistency(CANONICAL_EXTRACTIONS),
            check_duplicate_id(CANONICAL_EXTRACTIONS, set()),
            check_document_hash(CANONICAL_HASHES, CANONICAL_HASHES),
        ]
        score, band = compute_risk_score(checks)
        assert score == 0
        assert band == RiskBand.LOW

    def test_one_fail(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["invoice"] = {**modified["invoice"], "invoiceAmount": 950000.00}
        checks = [check_amount_match(modified)]
        score, band = compute_risk_score(checks)
        assert score == 25
        assert band == RiskBand.LOW  # 25 is still LOW (≤30)

    def test_three_fails(self):
        modified = {**CANONICAL_EXTRACTIONS}
        modified["invoice"] = {
            **modified["invoice"],
            "invoiceAmount": 950000.00,
            "buyerName": "XYZ Corp",
        }
        modified["grn"] = {**modified["grn"], "receivedQuantity": 4500}
        checks = [
            check_amount_match(modified),
            check_buyer_match(modified),
            check_qty_match(modified),
        ]
        score, band = compute_risk_score(checks)
        assert score == 75
        assert band == RiskBand.HIGH


class TestRunAllChecks:
    def test_canonical_happy_path(self):
        checks, score, band = run_all_checks(
            extractions=CANONICAL_EXTRACTIONS,
            expected_hashes=CANONICAL_HASHES,
            actual_hashes=CANONICAL_HASHES,
            existing_invoice_ids=set(),
        )
        assert len(checks) == 6
        assert score == 0
        assert band == RiskBand.LOW
        assert all(c.status == VerificationStatus.PASS for c in checks)
