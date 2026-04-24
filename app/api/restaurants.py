from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_restaurants(
    query: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    service = CatalogService(db)
    items = service.list_restaurants(query=query, limit=limit)
    return {
        "count": len(items),
        "results": [{"id": r.id, "name": r.name} for r in items],
    }