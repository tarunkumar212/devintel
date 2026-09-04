from fastapi import FastAPI
from sqlalchemy.orm import Session

from backend.database import engine
from backend.models import Log
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

        return db_log