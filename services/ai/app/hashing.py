"""
AgriCredX AI Service — SHA-256 Hashing Utilities.

Provides deterministic hashing that MUST produce identical output
to the frontend's SubtleCrypto.digest('SHA-256', ...) and the
packages/hashing/ TypeScript implementation.

The canonical serialization for attestation payloads follows strict
key ordering (alphabetical) with no whitespace in the JSON output.
"""

import hashlib
import json
from typing import Any, Dict


def sha256_bytes(data: bytes) -> str:
    """Compute SHA-256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def sha256_string(text: str) -> str:
    """Compute SHA-256 hex digest of a UTF-8 string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def canonical_json(payload: Dict[str, Any]) -> str:
    """
    Produce a canonical JSON string from a dict.

    Rules for determinism:
      1. Keys sorted alphabetically (recursive).
      2. No whitespace between separators.
      3. Unicode characters NOT escaped (ensure_ascii=False).

    This ensures that the same logical payload produces the same
    string in both Python and JavaScript (JSON.stringify with
    sorted keys and no spaces).
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_attestation_digest(payload: Dict[str, Any]) -> str:
    """
    Compute the SHA-256 digest of a canonical attestation payload.

    This is the digest that gets anchored on-chain. It MUST produce
    the same output as the JavaScript implementation in
    packages/hashing/.

    Args:
        payload: The attestation payload dict (matching AttestationPayload type).

    Returns:
        Hex-encoded SHA-256 digest string.
    """
    canonical = canonical_json(payload)
    return sha256_string(canonical)
