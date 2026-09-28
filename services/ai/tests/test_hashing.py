"""
Unit tests for the SHA-256 hashing and canonical serialization.

Verifies that the Python hashing produces deterministic output
that would match the JavaScript implementation.
"""

import pytest
from app.hashing import (
    canonical_json,
    compute_attestation_digest,
    sha256_bytes,
    sha256_string,
)


class TestSha256:
    def test_bytes_deterministic(self):
        data = b"Hello, AgriCredX!"
        h1 = sha256_bytes(data)
        h2 = sha256_bytes(data)
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex digest is 64 chars

    def test_string_deterministic(self):
        text = "INV-2026-09124"
        h1 = sha256_string(text)
        h2 = sha256_string(text)
        assert h1 == h2

    def test_different_input_different_hash(self):
        assert sha256_string("850000") != sha256_string("950000")

    def test_known_value(self):
        # SHA-256 of empty string is a known constant
        assert sha256_bytes(b"") == (
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )


class TestCanonicalJson:
    def test_sorted_keys(self):
        payload = {"b": 2, "a": 1, "c": 3}
        result = canonical_json(payload)
        assert result == '{"a":1,"b":2,"c":3}'

    def test_no_whitespace(self):
        payload = {"key": "value"}
        result = canonical_json(payload)
        assert " " not in result

    def test_nested_sorted(self):
        payload = {"z": {"b": 2, "a": 1}, "a": 0}
        result = canonical_json(payload)
        assert result == '{"a":0,"z":{"a":1,"b":2}}'


class TestAttestationDigest:
    def test_deterministic(self):
        payload = {
            "schemaVersion": "1.0",
            "invoiceId": "INV-2026-09124",
            "supplierWallet": "0xabc",
            "buyerWallet": "0xdef",
            "invoiceAmount": 850000,
            "currency": "INR",
            "dueDate": "2026-11-19",
            "poHash": "hash1",
            "invoiceHash": "hash2",
            "grnHash": "hash3",
            "qualityEvidenceHash": "hash4",
            "poMatched": True,
            "grnMatched": True,
            "buyerAccepted": True,
            "duplicateCheckPassed": True,
            "verificationEngineVersion": "v1",
            "createdAt": "2026-09-28T12:00:00Z",
        }
        d1 = compute_attestation_digest(payload)
        d2 = compute_attestation_digest(payload)
        assert d1 == d2
        assert len(d1) == 64

    def test_order_independence(self):
        """Key ordering in the input dict should not affect the digest."""
        payload_a = {"a": 1, "b": 2, "c": 3}
        payload_b = {"c": 3, "a": 1, "b": 2}
        assert compute_attestation_digest(payload_a) == compute_attestation_digest(payload_b)

    def test_tamper_changes_digest(self):
        base = {
            "invoiceAmount": 850000,
            "invoiceId": "INV-2026-09124",
        }
        tampered = {
            "invoiceAmount": 950000,
            "invoiceId": "INV-2026-09124",
        }
        assert compute_attestation_digest(base) != compute_attestation_digest(tampered)
