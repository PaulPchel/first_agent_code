"""Tests for the GET /search endpoint."""


class TestSearchEndpoint:
    def test_search_returns_200(self, test_client):
        resp = test_client.get("/search", params={"query": "burger"})
        assert resp.status_code == 200

    def test_search_returns_results_key(self, test_client):
        resp = test_client.get("/search", params={"query": "burger"})
        data = resp.json()
        assert "results" in data

    def test_search_finds_burger(self, test_client):
        resp = test_client.get("/search", params={"query": "burger"})
        names = [r["name"] for r in resp.json()["results"]]
        assert "Burger" in names

    def test_search_russian_query(self, test_client):
        resp = test_client.get("/search", params={"query": "пицца"})
        names = [r["name"] for r in resp.json()["results"]]
        assert "Pizza" in names

    def test_search_no_results(self, test_client):
        resp = test_client.get("/search", params={"query": "xyznotfood"})
        assert resp.json()["results"] == []

    def test_search_missing_query_returns_422(self, test_client):
        resp = test_client.get("/search")
        assert resp.status_code == 422

    def test_search_result_has_nutrition(self, test_client):
        resp = test_client.get("/search", params={"query": "salad"})
        results = resp.json()["results"]
        assert len(results) > 0
        item = results[0]
        assert "calories" in item
        assert "protein" in item
        assert "fat" in item
        assert "carbs" in item
