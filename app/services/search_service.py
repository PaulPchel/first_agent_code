from sqlalchemy import or_
from app.db.models import Dish, Restaurant


class SearchService:
    def __init__(self, db):
        self.db = db
        self.translations = {
            "куриный": "chicken",
            "бургер": "burger",
            "картошка": "fries",
            "фри": "fries",
            "салат": "salad",
            "пицца": "pizza",
            "кола": "cola",
        }

    def translate_query(self, query: str) -> str:
        words = query.lower().split()
        translated = [self.translations.get(w, w) for w in words]
        return " ".join(translated)

    def search(self, query: str):
        q_original = query.strip()
        q_translated = self.translate_query(q_original)

        pattern_original = f"%{q_original}%"
        pattern_translated = f"%{q_translated}%"

        rows = (
            self.db.query(Dish, Restaurant)
            .join(Restaurant, Dish.restaurant_id == Restaurant.id)
            .filter(
                or_(
                    Dish.dish_name.ilike(pattern_original),
                    Dish.description.ilike(pattern_original),
                    Restaurant.name.ilike(pattern_original),
                    Dish.dish_name.ilike(pattern_translated),
                    Dish.description.ilike(pattern_translated),
                    Restaurant.name.ilike(pattern_translated),
                )
            )
            .limit(100)
            .all()
        )

        results = []
        for dish, restaurant in rows:
            results.append(
                {
                    "dish_name": dish.dish_name,
                    "restaurant": restaurant.name,
                    "description": dish.description,
                    "price": dish.price,
                    "calories": dish.calories,
                    "protein": dish.protein,
                    "fat": dish.fat,
                    "carbs": dish.carbs,
                    "score": 1.0,
                }
            )

        return results