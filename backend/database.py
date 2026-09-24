import os

from dotenv import load_dotenv
from sqlalchemy import create_engine

from backend.models import Base


environment = os.getenv("APP_ENV", "development")

if environment == "test":
    load_dotenv(".env.test")
else:
    load_dotenv(".env")


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)