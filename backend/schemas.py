from pydantic import BaseModel, field_validator


class LogCreate(BaseModel):
    level: str
    message: str
    application_id: int

class IncidentStatusUpdate(BaseModel):
    status: str

class ApplicationCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        cleaned_name = value.strip()

        if not cleaned_name:
            raise ValueError("Application name cannot be empty")

        if len(cleaned_name) > 100:
            raise ValueError("Application name must be 100 characters or fewer")

        return cleaned_name