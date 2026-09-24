from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def create_test_application(name="pytest-app"):
    response = client.post(
        "/applications",
        json={"name": name},
    )

    assert response.status_code == 201
    return response.json()


def send_error_logs(application_id, count):
    for index in range(count):
        response = client.post(
            "/logs",
            json={
                "application_id": application_id,
                "level": "ERROR",
                "message": f"Test error {index + 1}",
            },
        )

        assert response.status_code == 200


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

    assert first_response.status_code == 201
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

    assert response.status_code == 201
    assert response.json()["name"] == application_name


def test_error_spike_creates_incident():
    application = create_test_application()

    send_error_logs(application["id"], 6)

    response = client.get("/incidents")

    assert response.status_code == 200

    incidents = response.json()

    assert len(incidents) == 1
    assert incidents[0]["application_id"] == application["id"]
    assert incidents[0]["status"] == "open"
    assert incidents[0]["error_count"] == 6


def test_open_incident_prevents_duplicate():
    application = create_test_application()

    send_error_logs(application["id"], 6)

    send_error_logs(application["id"], 2)

    response = client.get("/incidents")

    assert response.status_code == 200

    incidents = response.json()

    assert len(incidents) == 1


def test_investigating_incident_prevents_duplicate():
    application = create_test_application()

    send_error_logs(application["id"], 6)

    incidents = client.get("/incidents").json()
    incident_id = incidents[0]["id"]

    update_response = client.patch(
        f"/incidents/{incident_id}",
        json={"status": "investigating"},
    )

    assert update_response.status_code == 200

    send_error_logs(application["id"], 1)

    incidents = client.get("/incidents").json()

    assert len(incidents) == 1
    assert incidents[0]["status"] == "investigating"


def test_incident_evidence_returns_error_logs():
    application = create_test_application()

    send_error_logs(application["id"], 6)

    incidents = client.get("/incidents").json()
    incident_id = incidents[0]["id"]

    response = client.get(
        f"/incidents/{incident_id}/logs"
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 6

    for log in logs:
        assert log["application_id"] == application["id"]
        assert log["level"] == "ERROR"