from pydantic import BaseModel


class LogCreate(BaseModel):
    level: str
    message: str
    service: str