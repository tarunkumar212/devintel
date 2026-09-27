from pydantic import BaseModel, field_validator


class LogCreate(BaseModel):
    level: str
    message: str
    application_id: int

    @field_validator("level")
    @classmethod
    def validate_level(cls, value: str):
        level = value.strip().upper()

        allowed_levels = {"INFO", "WARNING", "ERROR"}

        if level not in allowed_levels:
            raise ValueError(
                "Log level must be INFO, WARNING, or ERROR"
            )

        return level

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str):
        message = value.strip()

        if not message:
            raise ValueError("Log message cannot be empty")

        if len(message) > 1000:
            raise ValueError(
                "Log message must be 1000 characters or fewer"
            )

        return message

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