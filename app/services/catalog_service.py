from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.models import Dish, Restaurant


class CatalogService:
    def __init__(self, db: Session):
        self.db = db

    def list_restaurants(self, query: str | None = None, limit: int = 50):
        q = self.db.query(Restaurant)
        if query:
            pattern = f"%{query}%"
            q = q.filter(Restaurant.name.ilike(pattern))
        return q.order_by(Restaurant.name.asc()).limit(limit).all()

    def get_restaurant(self, restaurant_id: int):
        return self.db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()

    def avg_calories_by_restaurant(self) -> dict[int, float]:
        rows = (
            self.db.query(Dish.restaurant_id, func.avg(Dish.calories))
            .filter(Dish.calories.isnot(None))
            .group_by(Dish.restaurant_id)
            .all()
        )
        return {int(rid): round(float(avg), 0) for rid, avg in rows}

    def list_dishes(self, restaurant_id: int, query: str | None = None, limit: int = 100):
        q = self.db.query(Dish).filter(Dish.restaurant_id == restaurant_id)
        if query:
            pattern = f"%{query}%"
            q = q.filter(or_(Dish.dish_name.ilike(pattern), Dish.description.ilike(pattern)))
        return q.order_by(Dish.dish_name.asc()).limit(limit).all()