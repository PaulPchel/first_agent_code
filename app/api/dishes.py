"""Search endpoint for structured dish data extracted from menu photos."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Dish

router = APIRouter(prefix="/dishes", tags=["dishes"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/search")
def search_dishes(
    query: str = Query(default=None, description="Search by dish name or restaurant"),
    restaurant: str = Query(default=None, description="Filter by exact restaurant name"),
    db: Session = Depends(get_db),
):
    q = db.query(Dish)

    if restaurant:
        q = q.filter(Dish.restaurant == restaurant)

    if query:
        pattern = f"%{query}%"
        q = q.filter(or_(
            Dish.dish_name.ilike(pattern),
            Dish.restaurant.ilike(pattern),
        ))

    dishes = q.limit(50).all()

    return {
        "query": query,
        "restaurant": restaurant,
        "count": len(dishes),
        "results": [
            {
                "restaurant": d.restaurant,
                "dish_name": d.dish_name,
                "description": d.description,
                "price": d.price,
                "calories": d.calories,
                "protein": d.protein,
                "fat": d.fat,
                "carbs": d.carbs,
            }
            for d in dishes
        ],
    }
