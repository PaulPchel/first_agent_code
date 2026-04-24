from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Dish, Restaurant
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/dishes", tags=["dishes"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_dishes(
    restaurant_id: int = Query(..., ge=1),
    query: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
):
    service = CatalogService(db)
    items = service.list_dishes(restaurant_id=restaurant_id, query=query, limit=limit)
    return {
        "restaurant_id": restaurant_id,
        "count": len(items),
        "results": [
            {
                "id": d.id,
                "restaurant_id": d.restaurant_id,
                "dish_name": d.dish_name,
                "description": d.description,
                "price": d.price,
                "calories": d.calories,
                "protein": d.protein,
                "fat": d.fat,
                "carbs": d.carbs,
            }
            for d in items
        ],
    }


@router.get("/search")
def search_dishes(
    query: str | None = Query(default=None, description="Search by dish or restaurant"),
    restaurant: str | None = Query(default=None, description="Filter by restaurant name"),
    limit: int = Query(default=50, ge=1, le=300),
    db: Session = Depends(get_db),
):
    q = db.query(Dish, Restaurant).join(Restaurant, Dish.restaurant_id == Restaurant.id)

    if restaurant:
        q = q.filter(Restaurant.name == restaurant)

    if query:
        pattern = f"%{query}%"
        q = q.filter(
            or_(
                Dish.dish_name.ilike(pattern),
                Dish.description.ilike(pattern),
                Restaurant.name.ilike(pattern),
            )
        )

    rows = q.limit(limit).all()

    return {
        "query": query,
        "restaurant": restaurant,
        "count": len(rows),
        "results": [
            {
                "restaurant": r.name,
                "dish_name": d.dish_name,
                "description": d.description,
                "price": d.price,
                "calories": d.calories,
                "protein": d.protein,
                "fat": d.fat,
                "carbs": d.carbs,
            }
            for d, r in rows
        ],
    }