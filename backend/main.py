from datetime import timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import engine
from backend.models import (
    Application,
    Base,
    Incident,
    IncidentRCA,
    Log,
)
from backend.schemas import (
    ApplicationCreate,
    IncidentContextResponse,
    IncidentStatusUpdate,
    LogCreate,
    RCAResponse,
)
from backend.services.ai_rca import (
    analyze_incident,
    build_incident_context,
    serialize_rca,
)
from backend.services.incident_detection import (
    detect_incident,
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/logs", status_code=201)
def create_log(log: LogCreate):
    with Session(engine) as session:
        application = session.get(
            Application,
            log.application_id,
        )

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found",
            )

        db_log = Log(
            level=log.level,
            message=log.message,
            application_id=application.id,
        )

        session.add(db_log)
        session.commit()
        session.refresh(db_log)

        if log.level == "ERROR":
            detect_incident(
                session,
                application.id,
            )

        return db_log


@app.get("/incidents")
def get_incidents():
    with Session(engine) as session:
        incidents = session.scalars(
            select(Incident).order_by(
                Incident.created_at.desc()
            )
        ).all()

        return incidents


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: int):
    with Session(engine) as session:
        incident = session.get(
            Incident,
            incident_id,
        )

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        return incident


@app.patch("/incidents/{incident_id}")
def update_incident_status(
    incident_id: int,
    update: IncidentStatusUpdate,
):
    with Session(engine) as session:
        incident = session.get(
            Incident,
            incident_id,
        )

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        allowed_statuses = {
            "open",
            "investigating",
            "resolved",
        }

        if update.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid incident status",
            )

        incident.status = update.status

        session.commit()
        session.refresh(incident)

        return incident


@app.post("/applications", status_code=201)
def create_application(
    application: ApplicationCreate,
):
    with Session(engine) as session:
        db_application = Application(
            name=application.name,
        )

        session.add(db_application)

        try:
            session.commit()
        except IntegrityError:
            session.rollback()

            raise HTTPException(
                status_code=409,
                detail="Application already exists",
            )

        session.refresh(db_application)

        return db_application


@app.get("/applications")
def get_applications():
    with Session(engine) as session:
        applications = session.scalars(
            select(Application).order_by(
                Application.created_at.desc()
            )
        ).all()

        return applications


@app.get("/applications/{application_id}")
def get_application(application_id: int):
    with Session(engine) as session:
        application = session.get(
            Application,
            application_id,
        )

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found",
            )

        return application


@app.get("/incidents/{incident_id}/logs")
def get_incident_logs(incident_id: int):
    with Session(engine) as session:
        incident = session.get(
            Incident,
            incident_id,
        )

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        window_start = (
            incident.created_at
            - timedelta(minutes=5)
        )

        logs = session.scalars(
            select(Log)
            .where(
                Log.application_id
                == incident.application_id,
                Log.level == "ERROR",
                Log.created_at >= window_start,
                Log.created_at <= incident.created_at,
            )
            .order_by(Log.created_at.asc())
        ).all()

        return logs


@app.get(
    "/incidents/{incident_id}/context",
    response_model=IncidentContextResponse,
)
def get_incident_context(
    incident_id: int,
):
    with Session(engine) as session:
        try:
            context = build_incident_context(
                session,
                incident_id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail=str(exc),
            )

        return {
            "incident_id": context["incident"]["id"],
            "status": context["incident"]["status"],
            "error_count": context["incident"]["error_count"],
            "created_at": context["incident"]["created_at"],
            "application_id": context["application"]["id"],
            "application_name": context["application"]["name"],
            "evidence_logs": context["evidence_logs"],
        }


@app.get(
    "/incidents/{incident_id}/rca",
    response_model=RCAResponse,
)
def get_incident_rca(
    incident_id: int,
):
    with Session(engine) as session:
        incident = session.get(
            Incident,
            incident_id,
        )

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        rca = session.scalar(
            select(IncidentRCA).where(
                IncidentRCA.incident_id
                == incident_id
            )
        )

        if rca is None:
            raise HTTPException(
                status_code=404,
                detail="RCA not available",
            )

        return serialize_rca(rca)


@app.post(
    "/incidents/{incident_id}/analyze",
    response_model=RCAResponse,
)
def analyze_incident_endpoint(
    incident_id: int,
):
    with Session(engine) as session:
        try:
            rca = analyze_incident(
                session,
                incident_id,
            )

        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail=str(exc),
            )

        except RuntimeError as exc:
            raise HTTPException(
                status_code=503,
                detail=str(exc),
            )

        return serialize_rca(rca)