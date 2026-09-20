from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import engine
from backend.models import Application, Incident, Log
from backend.schemas import ApplicationCreate, IncidentStatusUpdate, LogCreate
from backend.services.incident_detection import detect_incident

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/logs")
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
            select(Incident).order_by(Incident.created_at.desc())
        ).all()

        return incidents


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: int):
    with Session(engine) as session:
        incident = session.get(Incident, incident_id)

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
        incident = session.get(Incident, incident_id)

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        allowed_statuses = {"open", "investigating", "resolved"}

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
def create_application(application: ApplicationCreate):
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
            select(Application).order_by(Application.created_at.desc())
        ).all()

        return applications


@app.get("/applications/{application_id}")
def get_application(application_id: int):
    with Session(engine) as session:
        application = session.get(Application, application_id)

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found",
            )

        return application
    

@app.get("/incidents/{incident_id}/logs")
def get_incident_logs(incident_id: int):
    with Session(engine) as session:
        incident = session.get(Incident, incident_id)

        if incident is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        window_start = incident.created_at - timedelta(minutes=5)

        logs = session.scalars(
            select(Log)
            .where(
                Log.application_id == incident.application_id,
                Log.level == "ERROR",
                Log.created_at >= window_start,
                Log.created_at <= incident.created_at,
            )
            .order_by(Log.created_at.asc())
        ).all()

        return logs

