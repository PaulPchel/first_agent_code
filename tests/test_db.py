import pytest

from app.db.models import Dish, Restaurant
from app.db.seed import seed_database


class TestRestaurantAndDishModels:
    def test_create_restaurant(self, db_session):
        r = Restaurant(name="Burger King")
        db_session.add(r)
        db_session.commit()

        found = db_session.query(Restaurant).filter_by(name="Burger King").first()
        assert found is not None
        assert found.name == "Burger King"

    def test_create_dish_with_restaurant(self, db_session):
        r = Restaurant(name="Теремок")
        db_session.add(r)
        db_session.flush()

        d = Dish(
            restaurant_id=r.id,
            dish_name="Борщ",
            calories=320,
            protein=12,
            fat=15,
            carbs=28,
            price=290,
        )
        db_session.add(d)
        db_session.commit()

        found = db_session.query(Dish).filter_by(dish_name="Борщ").first()
        assert found is not None
        assert found.restaurant_id == r.id
        assert found.calories == 320


class TestSeedDatabase:
    def test_seed_creates_restaurants_and_dishes(self, db_session):
        seed_database(db_session)

        restaurants_count = db_session.query(Restaurant).count()
        dishes_count = db_session.query(Dish).count()

        assert restaurants_count >= 2
        assert dishes_count >= 4

    def test_seed_is_idempotent(self, db_session):
        seed_database(db_session)
        r1 = db_session.query(Restaurant).count()
        d1 = db_session.query(Dish).count()

        seed_database(db_session)
        r2 = db_session.query(Restaurant).count()
        d2 = db_session.query(Dish).count()

        assert r1 == r2
        assert d1 == d2

    def test_seed_contains_expected_items(self, db_session):
        seed_database(db_session)

        restaurant_names = {r.name for r in db_session.query(Restaurant).all()}
        dish_names = {d.dish_name for d in db_session.query(Dish).all()}

        assert "Burger King" in restaurant_names
        assert "Теремок" in restaurant_names
        assert "Whopper" in dish_names
        assert "Fries" in dish_names
