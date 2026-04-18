"""Tests for the GET /search endpoint."""


class TestSearchEndpoint:
    def test_search_returns_200(self, test_client):
        resp = test_client.get("/search", params={"query": "whopper"})
        assert resp.status_code == 200

    def test_search_returns_results_key(self, test_client):
        resp = test_client.get("/search", params={"query": "whopper"})
        data = resp.json()
        assert "results" in data

    def test_search_finds_dish_by_name(self, test_client):
        resp = test_client.get("/search", params={"query": "whopper"})
        dish_names = [r["dish_name"] for r in resp.json()["results"]]
        assert "Whopper" in dish_names

    def test_search_finds_by_restaurant_name(self, test_client):
        resp = test_client.get("/search", params={"query": "Burger King"})
        results = resp.json()["results"]
        assert len(results) > 0
        assert any(r["restaurant"] == "Burger King" for r in results)

    def test_search_russian_query(self, test_client):
        resp = test_client.get("/search", params={"query": "Борщ"})
        dish_names = [r["dish_name"] for r in resp.json()["results"]]
        assert "Борщ" in dish_names

    def test_search_no_results(self, test_client):
        resp = test_client.get("/search", params={"query": "xyznotfood"})
        assert resp.json()["results"] == []

    def test_search_missing_query_returns_422(self, test_client):
        resp = test_client.get("/search")
        assert resp.status_code == 422

    def test_search_result_has_required_fields(self, test_client):
        resp = test_client.get("/search", params={"query": "fries"})
        results = resp.json()["results"]
        assert len(results) > 0

        item = results[0]
        assert "dish_name" in item
        assert "restaurant" in item
        assert "calories" in item
        assert "protein" in item
        assert "fat" in item
        assert "carbs" in item
        assert "score" in item
