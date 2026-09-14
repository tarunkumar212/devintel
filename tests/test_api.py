from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_get_incidents():
    response = client.get("/incidents")

    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_incident_not_found():
    response = client.get("/incidents/999999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Incident not found"}


def test_invalid_incident_status():
    response = client.patch(
        "/incidents/999999999",
        json={"status": "banana"},
    )

    assert response.status_code == 404