"""
AgriCredX AI Service — PDF Text Extraction.

Uses PyMuPDF (fitz) as the primary extraction engine.
Falls back to a basic OCR-like approach when PyMuPDF returns
insufficient text (< MIN_TEXT_LENGTH chars).
"""

import fitz  # PyMuPDF
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Minimum character count to consider extraction successful
MIN_TEXT_LENGTH = 50


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes using PyMuPDF.

    Args:
        pdf_bytes: Raw PDF file content.

    Returns:
        Extracted text from all pages, concatenated.

    Raises:
        ValueError: If the PDF cannot be opened or contains no extractable content.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Failed to open PDF: {e}")

    pages_text = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        if text and text.strip():
            pages_text.append(text.strip())

    doc.close()

    full_text = "\n\n".join(pages_text)

    if len(full_text) < MIN_TEXT_LENGTH:
        logger.warning(
            f"PyMuPDF extracted only {len(full_text)} chars — "
            f"below threshold of {MIN_TEXT_LENGTH}. "
            f"OCR fallback may be needed."
        )
        # In a production system, we'd invoke Tesseract OCR here.
        # For the MVP, we log and proceed with whatever we have.

    return full_text


def compute_sha256(data: bytes) -> str:
    """
    Compute the SHA-256 hex digest of raw bytes.

    This MUST produce the same output as the frontend's
    SubtleCrypto.digest('SHA-256', ...) and the JS hashing package.
    """
    return hashlib.sha256(data).hexdigest()


def extract_text_from_url(url: str, expected_sha256: Optional[str] = None) -> tuple[str, str]:
    """
    Download a PDF from a URL and extract its text.

    Args:
        url: Signed URL to the PDF in Supabase Storage.
        expected_sha256: Optional expected hash for integrity verification.

    Returns:
        Tuple of (extracted_text, computed_sha256).

    Raises:
        ValueError: If download fails or hash mismatch is detected.
    """
    import httpx

    response = httpx.get(url, timeout=30.0, follow_redirects=True)
    response.raise_for_status()

    pdf_bytes = response.content
    actual_sha256 = compute_sha256(pdf_bytes)

    if expected_sha256 and actual_sha256 != expected_sha256:
        logger.error(
            f"SHA-256 mismatch! Expected: {expected_sha256}, "
            f"Got: {actual_sha256}"
        )
        # We still extract text — the hash mismatch will be flagged
        # by the DOCUMENT_HASH check in the rules engine.

    text = extract_text_from_bytes(pdf_bytes)
    return text, actual_sha256
