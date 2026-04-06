from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.search_service import SearchService

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/search")
def search(query: str, db: Session = Depends(get_db)):
    service = SearchService(db)
    results = service.search(query)
    return {"results": results}