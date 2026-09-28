from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}

def test_verify_endpoint_skeleton():
    payload = {
        "receivableId": "123",
        "documents": []
    }
    response = client.post("/api/v1/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["riskBand"] == "LOW"
    assert data["engineVersion"] == "0.1.0-bootstrap"
