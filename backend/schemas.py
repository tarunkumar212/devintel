from pydantic import BaseModel


class LogCreate(BaseModel):
    level: str
    message: str
    application_id: int

class IncidentStatusUpdate(BaseModel):
    status: str

class ApplicationCreate(BaseModel):
    name: str