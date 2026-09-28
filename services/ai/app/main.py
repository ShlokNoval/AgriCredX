"""
AgriCredX AI Verification Service — Application Entry Point.

Runs a FastAPI server that exposes:
  - POST /api/v1/verify — Full document verification pipeline
  - POST /api/v1/extract/{type} — Single document extraction
  - GET  /health — Health check
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import verify

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

app = FastAPI(
    title="AgriCredX AI Verification Service",
    description=(
        "Extracts structured data from supply-chain documents (Invoice, PO, GRN, "
        "Quality Certificate, Lab Report) using PyMuPDF + Gemini, then runs "
        "deterministic cross-document verification checks."
    ),
    version="0.1.0",
)

# CORS — allow all origins for hackathon. Lock down in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "version": "0.1.0",
        "gemini_configured": gemini_configured,
    }
