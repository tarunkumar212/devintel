from fastapi.testclient import TestClient

from backend.main import app
from backend.services import ai_rca


client = TestClient(app)


def create_test_application(name="ai-test-app"):
    response = client.post(
        "/applications",
        json={"name": name},
    )

    assert response.status_code == 201

    return response.json()


def create_incident(application_id):
    for index in range(6):
        response = client.post(
            "/logs",
            json={
                "application_id": application_id,
                "level": "ERROR",
                "message": (
                    f"Database timeout {index + 1}"
                ),
            },
        )

        assert response.status_code == 201

    response = client.get("/incidents")

    assert response.status_code == 200

    return response.json()[0]


def test_incident_context():
    application = create_test_application()
    incident = create_incident(
        application["id"]
    )

    response = client.get(
        f"/incidents/{incident['id']}/context"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["incident_id"] == incident["id"]
    assert data["application_id"] == application["id"]
    assert data["application_name"] == application["name"]
    assert len(data["evidence_logs"]) == 6


def test_incident_context_not_found():
    response = client.get(
        "/incidents/999999/context"
    )

    assert response.status_code == 404


def test_ai_analysis(
    monkeypatch,
):
    application = create_test_application()
    incident = create_incident(
        application["id"]
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_embedding",
        lambda text: [1.0, 0.0],
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_rca",
        lambda context, historical_matches: ai_rca.RCAOutput(
            root_cause="Database timeout",
            evidence=[
                "Database timeout 1",
                "Database timeout 2",
            ],
            confidence=0.92,
            recommendation=(
                "Investigate database connectivity "
                "and connection pool limits."
            ),
        ),
    )

    response = client.post(
        f"/incidents/{incident['id']}/analyze"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["incident_id"] == incident["id"]
    assert data["root_cause"] == "Database timeout"
    assert data["confidence"] == 0.92
    assert len(data["evidence"]) == 2


def test_ai_analysis_is_persisted(
    monkeypatch,
):
    application = create_test_application()
    incident = create_incident(
        application["id"]
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_embedding",
        lambda text: [1.0, 0.0],
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_rca",
        lambda context, historical_matches: ai_rca.RCAOutput(
            root_cause="Connection pool exhaustion",
            evidence=[
                "Database timeout 1",
            ],
            confidence=0.85,
            recommendation=(
                "Review database connection pool usage."
            ),
        ),
    )

    analyze_response = client.post(
        f"/incidents/{incident['id']}/analyze"
    )

    assert analyze_response.status_code == 200

    response = client.get(
        f"/incidents/{incident['id']}/rca"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["root_cause"] == (
        "Connection pool exhaustion"
    )


def test_rag_retrieves_resolved_historical_incident(
    monkeypatch,
):
    application = create_test_application()
    first_incident = create_incident(
        application["id"]
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_embedding",
        lambda text: [1.0, 0.0],
    )

    monkeypatch.setattr(
        ai_rca,
        "generate_rca",
        lambda context, historical_matches: ai_rca.RCAOutput(
            root_cause="Database timeout",
            evidence=[
                "Database timeout 1",
            ],
            confidence=0.9,
            recommendation=(
                "Check database connectivity."
            ),
        ),
    )

    first_response = client.post(
        f"/incidents/{first_incident['id']}/analyze"
    )

    assert first_response.status_code == 200

    resolve_response = client.patch(
        f"/incidents/{first_incident['id']}",
        json={"status": "resolved"},
    )

    assert resolve_response.status_code == 200

    second_incident = create_incident(
        application["id"]
    )

    captured_matches = []

    def fake_generate_rca(
        context,
        historical_matches,
    ):
        captured_matches.extend(
            historical_matches
        )

        return ai_rca.RCAOutput(
            root_cause="Database timeout",
            evidence=[
                "Database timeout 1",
            ],
            confidence=0.93,
            recommendation=(
                "Check database connectivity."
            ),
        )

    monkeypatch.setattr(
        ai_rca,
        "generate_rca",
        fake_generate_rca,
    )

    second_response = client.post(
        f"/incidents/{second_incident['id']}/analyze"
    )

    assert second_response.status_code == 200
    assert len(captured_matches) == 1
    assert (
        captured_matches[0]["incident_id"]
        == first_incident["id"]
    )
    assert (
        captured_matches[0]["similarity"]
        == 1.0
    )