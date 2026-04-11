"""Sanity checks for frontend assets.

These tests parse the static JS/HTML to make sure critical wiring
(real API calls, required UI elements) hasn't been swapped out for
hardcoded or mocked logic.
"""

import os

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


def _read_frontend(filename: str) -> str:
    with open(os.path.join(FRONTEND_DIR, filename)) as f:
        return f.read()


class TestAppJsSanity:
    def test_calls_real_dishes_search_endpoint(self):
        js = _read_frontend("app.js")
        assert "/dishes/search" in js, "app.js must call the /dishes/search API"

    def test_uses_fetch(self):
        js = _read_frontend("app.js")
        assert "fetch(" in js, "app.js must use fetch() to call the backend"

    def test_no_hardcoded_results(self):
        js = _read_frontend("app.js")
        for keyword in ["mock", "hardcode", "dummy", "fake"]:
            assert keyword not in js.lower(), (
                f"app.js contains suspicious keyword '{keyword}'"
            )

    def test_reads_query_from_input(self):
        js = _read_frontend("app.js")
        assert 'getElementById("query")' in js, (
            "app.js must read the query from the #query input"
        )

    def test_renders_into_results_div(self):
        js = _read_frontend("app.js")
        assert 'getElementById("results")' in js, (
            "app.js must render results into the #results div"
        )


class TestIndexHtmlSanity:
    def test_has_search_input(self):
        html = _read_frontend("index.html")
        assert 'id="query"' in html, "index.html must have a #query input"

    def test_has_search_button(self):
        html = _read_frontend("index.html")
        assert 'id="searchBtn"' in html, "index.html must have a #searchBtn button"

    def test_has_results_container(self):
        html = _read_frontend("index.html")
        assert 'id="results"' in html, "index.html must have a #results container"

    def test_loads_app_js(self):
        html = _read_frontend("index.html")
        assert "app.js" in html, "index.html must load app.js"
