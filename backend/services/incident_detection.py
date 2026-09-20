from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Incident, Log


def detect_incident(
    session: Session,
    application_id: int,
    ):
    five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)

    error_count = session.scalar(
        select(func.count())
        .select_from(Log)
        .where(
            Log.application_id == application_id,
            Log.level == "ERROR",
            Log.created_at >= five_minutes_ago,
        )
    )

    open_incident = session.scalar(
        select(Incident).where(
            Incident.application_id == application_id,
            Incident.status == "open",
        )
    )

    if error_count > 5 and open_incident is None:
        incident = Incident(
            application_id=application_id,
            error_count=error_count,
        )

        session.add(incident)
        session.commit()