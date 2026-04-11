"""Tests for the Dish model and GET /dishes/search endpoint."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.models import Dish
from app.api.dishes import router as dishes_router, get_db


@pytest.fixture()
def dish_data(db_session):
    """Seed a few Dish rows for testing."""
    dishes = [
        Dish(restaurant="Burger King", dish_name="Whopper", price=350, calories=660, protein=28, fat=40, carbs=49),
        Dish(restaurant="Burger King", dish_name="Fries", price=150, calories=380, protein=4, fat=18, carbs=50),
        Dish(restaurant="Теремок", dish_name="Борщ", price=290, calories=320, protein=12, fat=15, carbs=28),
        Dish(restaurant="Теремок", dish_name="Блин с курицей", price=350, calories=450, protein=25, fat=20, carbs=35),
    ]
    db_session.add_all(dishes)
    db_session.commit()
    return db_session


@pytest.fixture()
def dishes_client(dish_data):
    app = FastAPI()
    app.include_router(dishes_router)

    def _override():
        try:
            yield dish_data
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    return TestClient(app)


class TestDishModel:
    def test_create_dish(self, db_session):
        dish = Dish(restaurant="Test", dish_name="Soup", calories=200)
        db_session.add(dish)
        db_session.commit()

        result = db_session.query(Dish).filter_by(dish_name="Soup").first()
        assert result is not None
        assert result.restaurant == "Test"
        assert result.calories == 200

    def test_nullable_fields(self, db_session):
        dish = Dish(restaurant="R", dish_name="D")
        db_session.add(dish)
        db_session.commit()

        result = db_session.query(Dish).filter_by(dish_name="D").first()
        assert result.calories is None
        assert result.fat is None
        assert result.price is None


class TestDishesSearch:
    def test_returns_200(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "burger"})
        assert resp.status_code == 200

    def test_search_by_dish_name(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "Whopper"})
        results = resp.json()["results"]
        assert len(results) == 1
        assert results[0]["dish_name"] == "Whopper"

    def test_search_by_restaurant(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "Теремок"})
        results = resp.json()["results"]
        assert len(results) == 2

    def test_filter_by_restaurant(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"restaurant": "Burger King"})
        results = resp.json()["results"]
        assert len(results) == 2
        assert all(r["restaurant"] == "Burger King" for r in results)

    def test_combined_query_and_restaurant(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "Fries", "restaurant": "Burger King"})
        results = resp.json()["results"]
        assert len(results) == 1
        assert results[0]["dish_name"] == "Fries"

    def test_case_insensitive(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "whopper"})
        assert resp.json()["count"] == 1

    def test_no_results(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "nonexistent"})
        assert resp.json()["count"] == 0
        assert resp.json()["results"] == []

    def test_result_fields(self, dishes_client):
        resp = dishes_client.get("/dishes/search", params={"query": "Борщ"})
        item = resp.json()["results"][0]
        assert "restaurant" in item
        assert "dish_name" in item
        assert "calories" in item
        assert "protein" in item
        assert "fat" in item
        assert "carbs" in item
        assert "price" in item

    def test_no_params_returns_all(self, dishes_client):
        resp = dishes_client.get("/dishes/search")
        assert resp.json()["count"] == 4
