from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Incident, Log


def detect_incident(session: Session, service: str):
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)

    error_count = session.scalar(
        select(func.count())
        .select_from(Log)
        .where(
            Log.service == service,
            Log.level == "ERROR",
            Log.created_at >= five_minutes_ago,
        )
    )

    open_incident = session.scalar(
        select(Incident).where(
            Incident.service == service,
            Incident.status == "open",
        )
    )

    if error_count > 5 and open_incident is None:
        incident = Incident(
            service=service,
            error_count=error_count,
        )

        session.add(incident)
        session.commit()