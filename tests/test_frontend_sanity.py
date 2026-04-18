"""Sanity checks for frontend assets.

These tests parse static JS/HTML to ensure the frontend is wired
to real backend endpoints and expected UI elements exist.
"""

import os

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


def _read_frontend(filename: str) -> str:
    with open(os.path.join(FRONTEND_DIR, filename), encoding="utf-8") as f:
        return f.read()


class TestAppJsSanity:
    def test_uses_fetch(self):
        js = _read_frontend("app.js")
        assert "fetch(" in js, "app.js must use fetch() to call backend"

    def test_no_hardcoded_results(self):
        js = _read_frontend("app.js")
        for keyword in ["mock", "hardcode", "dummy", "fake"]:
            assert keyword not in js.lower(), f"app.js contains suspicious keyword '{keyword}'"

    def test_calls_restaurants_endpoint(self):
        js = _read_frontend("app.js")
        assert "/restaurants" in js, "app.js must call /restaurants"

    def test_calls_dishes_endpoint(self):
        js = _read_frontend("app.js")
        assert "/dishes?restaurant_id=" in js, "app.js must call /dishes with restaurant_id"

    def test_calls_user_state_endpoints(self):
        js = _read_frontend("app.js")
        assert "/user/restaurant" in js, "app.js must call /user/restaurant"
        assert "/user/dish" in js, "app.js must call /user/dish"
        assert "/user/result" in js, "app.js must call /user/result"

    def test_keeps_quick_search_compat(self):
        js = _read_frontend("app.js")
        assert "/dishes/search" in js, "app.js should keep quick-search call to /dishes/search"

    def test_reads_expected_inputs(self):
        js = _read_frontend("app.js")
        assert 'getElementById("restaurantSearch")' in js
        assert 'getElementById("dishSearch")' in js
        assert 'getElementById("restaurantSelect")' in js
        assert 'getElementById("dishSelect")' in js
        assert 'getElementById("query")' in js  # quick search

    def test_renders_into_results_div(self):
        js = _read_frontend("app.js")
        assert 'getElementById("results")' in js, "app.js must render into #results"


class TestIndexHtmlSanity:
    def test_has_quick_search_elements(self):
        html = _read_frontend("index.html")
        assert 'id="query"' in html, "index.html must have #query input"
        assert 'id="searchBtn"' in html, "index.html must have #searchBtn button"

    def test_has_restaurant_select_elements(self):
        html = _read_frontend("index.html")
        assert 'id="restaurantSearch"' in html, "index.html must have #restaurantSearch input"
        assert 'id="restaurantSelect"' in html, "index.html must have #restaurantSelect"

    def test_has_dish_select_elements(self):
        html = _read_frontend("index.html")
        assert 'id="dishSearch"' in html, "index.html must have #dishSearch input"
        assert 'id="dishSelect"' in html, "index.html must have #dishSelect"

    def test_has_results_container(self):
        html = _read_frontend("index.html")
        assert 'id="results"' in html, "index.html must have #results container"

    def test_loads_app_js(self):
        html = _read_frontend("index.html")
        assert "app.js" in html, "index.html must load app.js"
