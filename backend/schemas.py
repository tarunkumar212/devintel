from pydantic import BaseModel


class LogCreate(BaseModel):
    level: str
    message: str
    service: str

class IncidentStatusUpdate(BaseModel):
    status: str

class ApplicationCreate(BaseModel):
    name: str