from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import engine
from backend.models import Incident, Log
from backend.schemas import LogCreate
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
        db_log = Log(
            level=log.level,
            message=log.message,
            service=log.service,
        )

        session.add(db_log)
        session.commit()
        session.refresh(db_log)

        if log.level == "ERROR":
            detect_incident(session, log.service)
            
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