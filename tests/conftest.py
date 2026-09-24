import os

os.environ["APP_ENV"] = "test"

import pytest

from backend.database import engine
from backend.models import Base


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    yield

    Base.metadata.drop_all(bind=engine)