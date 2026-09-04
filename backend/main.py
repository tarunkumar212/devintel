from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import engine
from backend.models import Incident, Log
from backend.schemas import LogCreate

app = FastAPI()


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
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)

            error_count = session.scalar(
                select(func.count())
                .select_from(Log)
                .where(
                    Log.service == log.service,
                    Log.level == "ERROR",
                    Log.created_at >= five_minutes_ago,
                )
            )

            open_incident = session.scalar(
                select(Incident).where(
                    Incident.service == log.service,
                    Incident.status == "open",
                )
            )

            if error_count > 5 and open_incident is None:
                incident = Incident(
                    service=log.service,
                    error_count=error_count,
                )

                session.add(incident)
                session.commit()

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