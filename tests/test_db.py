"""Tests for database models and seed logic."""

from app.db.models import Food
from app.db.seed import seed_database


class TestFoodModel:
    def test_create_food(self, db_session):
        food = Food(name="Taco", calories=200, protein=10, fat=8, carbs=25)
        db_session.add(food)
        db_session.commit()

        result = db_session.query(Food).filter_by(name="Taco").first()
        assert result is not None
        assert result.calories == 200
        assert result.protein == 10

    def test_food_name_queryable(self, db_session):
        db_session.add(Food(name="Sushi", calories=150, protein=8, fat=2, carbs=30))
        db_session.commit()

        assert db_session.query(Food).filter_by(name="Sushi").count() == 1
        assert db_session.query(Food).filter_by(name="Nope").count() == 0


class TestSeedDatabase:
    def test_seeds_six_foods(self, db_session):
        seed_database(db_session)
        assert db_session.query(Food).count() == 6

    def test_seed_is_idempotent(self, db_session):
        seed_database(db_session)
        seed_database(db_session)
        assert db_session.query(Food).count() == 6

    def test_seed_contains_expected_items(self, db_session):
        seed_database(db_session)
        names = {f.name for f in db_session.query(Food).all()}
        assert "Chicken Burger" in names
        assert "Pizza" in names
        assert "Fries" in names

    def test_seed_nutrition_values(self, db_session):
        seed_database(db_session)
        pizza = db_session.query(Food).filter_by(name="Pizza").first()
        assert pizza.calories == 500
        assert pizza.protein == 22
        assert pizza.fat == 18
        assert pizza.carbs == 60
