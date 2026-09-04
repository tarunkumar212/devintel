from datetime import datetime, timedelta

from fastapi import FastAPI
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