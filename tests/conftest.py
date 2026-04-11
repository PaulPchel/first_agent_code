import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.models import Food
from app.db.seed import seed_database


@pytest.fixture()
def db_engine():
    """In-memory SQLite engine shared across threads via StaticPool."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(db_engine):
    """Session bound to the shared in-memory engine."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def seeded_db(db_session):
    """DB session pre-populated with the standard seed data."""
    seed_database(db_session)
    return db_session


@pytest.fixture()
def test_client(seeded_db):
    """FastAPI TestClient wired to a fresh in-memory DB."""
    from app.api.search import router as search_router, get_db
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(search_router)

    def _override_get_db():
        try:
            yield seeded_db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)
