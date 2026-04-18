"""Tests for the Dish model and GET /dishes endpoint."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.dishes import get_db, router as dishes_router
from app.db.models import Dish, Restaurant


@pytest.fixture()
def dish_data(db_session):
    """Seed restaurants + dishes for testing."""
    bk = Restaurant(name="Burger King")
    tr = Restaurant(name="Теремок")
    db_session.add_all([bk, tr])
    db_session.flush()

    dishes = [
        Dish(
            restaurant_id=bk.id,
            dish_name="Whopper",
            description="Beef burger",
            price=350,
            calories=660,
            protein=28,
            fat=40,
            carbs=49,
        ),
        Dish(
            restaurant_id=bk.id,
            dish_name="Fries",
            description="French fries",
            price=150,
            calories=380,
            protein=4,
            fat=18,
            carbs=50,
        ),
        Dish(
            restaurant_id=tr.id,
            dish_name="Борщ",
            description="Суп",
            price=290,
            calories=320,
            protein=12,
            fat=15,
            carbs=28,
        ),
        Dish(
            restaurant_id=tr.id,
            dish_name="Блин с курицей",
            description="Блин",
            price=350,
            calories=450,
            protein=25,
            fat=20,
            carbs=35,
        ),
    ]
    db_session.add_all(dishes)
    db_session.commit()

    return {"db": db_session, "bk_id": bk.id, "tr_id": tr.id}


@pytest.fixture()
def dishes_client(dish_data):
    app = FastAPI()
    app.include_router(dishes_router)

    def _override():
        try:
            yield dish_data["db"]
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    return TestClient(app)


class TestDishModel:
    def test_create_dish(self, db_session):
        r = Restaurant(name="Test R")
        db_session.add(r)
        db_session.flush()

        dish = Dish(restaurant_id=r.id, dish_name="Soup", calories=200)
        db_session.add(dish)
        db_session.commit()

        result = db_session.query(Dish).filter_by(dish_name="Soup").first()
        assert result is not None
        assert result.restaurant_id == r.id
        assert result.calories == 200

    def test_nullable_fields(self, db_session):
        r = Restaurant(name="R")
        db_session.add(r)
        db_session.flush()

        dish = Dish(restaurant_id=r.id, dish_name="D")
        db_session.add(dish)
        db_session.commit()

        result = db_session.query(Dish).filter_by(dish_name="D").first()
        assert result.calories is None
        assert result.fat is None
        assert result.price is None


class TestDishesEndpoint:
    def test_returns_200(self, dishes_client, dish_data):
        resp = dishes_client.get("/dishes", params={"restaurant_id": dish_data["bk_id"]})
        assert resp.status_code == 200

    def test_missing_restaurant_id_returns_422(self, dishes_client):
        resp = dishes_client.get("/dishes")
        assert resp.status_code == 422

    def test_filter_by_restaurant(self, dishes_client, dish_data):
        resp = dishes_client.get("/dishes", params={"restaurant_id": dish_data["bk_id"]})
        data = resp.json()

        assert data["restaurant_id"] == dish_data["bk_id"]
        assert data["count"] == 2
        assert all(item["restaurant_id"] == dish_data["bk_id"] for item in data["results"])

    def test_search_by_query_within_restaurant(self, dishes_client, dish_data):
        resp = dishes_client.get(
            "/dishes",
            params={"restaurant_id": dish_data["bk_id"], "query": "Whopper"},
        )
        results = resp.json()["results"]

        assert len(results) == 1
        assert results[0]["dish_name"] == "Whopper"

    def test_case_insensitive_query(self, dishes_client, dish_data):
        resp = dishes_client.get(
            "/dishes",
            params={"restaurant_id": dish_data["bk_id"], "query": "whopper"},
        )
        assert resp.json()["count"] == 1

    def test_no_results(self, dishes_client, dish_data):
        resp = dishes_client.get(
            "/dishes",
            params={"restaurant_id": dish_data["bk_id"], "query": "nonexistent"},
        )
        assert resp.json()["count"] == 0
        assert resp.json()["results"] == []

    def test_result_fields(self, dishes_client, dish_data):
        resp = dishes_client.get("/dishes", params={"restaurant_id": dish_data["tr_id"], "query": "Борщ"})
        item = resp.json()["results"][0]

        assert "id" in item
        assert "restaurant_id" in item
        assert "dish_name" in item
        assert "description" in item
        assert "price" in item
        assert "calories" in item
        assert "protein" in item
        assert "fat" in item
        assert "carbs" in item

    def test_no_query_returns_all_for_restaurant(self, dishes_client, dish_data):
        resp = dishes_client.get("/dishes", params={"restaurant_id": dish_data["tr_id"]})
        assert resp.json()["count"] == 2
