"""
Integration tests for the AgriCredX AI verification endpoints.
Tests the FastAPI routes with the TestClient.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert "gemini_configured" in data


def test_verify_endpoint_empty_documents():
    """Verify endpoint with no documents should still return a valid response."""
    payload = {
        "receivable_id": "test-123",
        "documents": []
    }
    response = client.post("/api/v1/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_band" in data
    assert "checks" in data
    assert "engine_version" in data
    assert data["engine_version"] == "v1"


def test_verify_endpoint_rejects_invalid_payload():
    """Verify endpoint rejects a request without required fields."""
    payload = {"bad": "data"}
    response = client.post("/api/v1/verify", json=payload)
    assert response.status_code == 422  # Validation error
