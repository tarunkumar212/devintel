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


def test_get_applications():
    response = client.get("/applications")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_duplicate_application_returns_conflict():
    application_name = "pytest-duplicate-app"

    first_response = client.post(
        "/applications",
        json={"name": application_name},
    )

    second_response = client.post(
        "/applications",
        json={"name": application_name},
    )

    assert first_response.status_code in [201, 409]
    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": "Application already exists"
    }

def test_incident_logs_not_found():
    response = client.get("/incidents/999999999/logs")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Incident not found"
    }

def test_application_not_found():
    response = client.get("/applications/999999999")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Application not found"
    }

def test_empty_application_name_rejected():
    response = client.post(
        "/applications",
        json={"name": "   "},
    )

    assert response.status_code == 422

def test_application_name_is_trimmed():
    application_name = "pytest-trimmed-app"

    response = client.post(
        "/applications",
        json={"name": f"   {application_name}   "},
    )

    assert response.status_code in [201, 409]