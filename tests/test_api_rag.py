"""Tests for the GET /rag/search endpoint with mocked OpenAI and ChromaDB."""

from unittest.mock import patch, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import rag_search
from app.api.rag_search import router as rag_router


@pytest.fixture()
def mock_openai():
    mock_client = MagicMock()
    embedding_obj = MagicMock()
    embedding_obj.embedding = [0.1] * 128
    mock_client.embeddings.create.return_value = MagicMock(data=[embedding_obj])
    return mock_client


@pytest.fixture()
def mock_collection():
    collection = MagicMock()
    collection.query.return_value = {
        "ids": [["rest1_1", "rest2_1"]],
        "documents": [["Menu text for restaurant 1...", "Menu text for restaurant 2..."]],
        "metadatas": [[
            {"restaurant": "TestRestaurant1", "image_id": "1", "s3_key": "photos/rest1_img1.jpg"},
            {"restaurant": "TestRestaurant2", "image_id": "1", "s3_key": "photos/rest2_img1.jpg"},
        ]],
        "distances": [[0.1, 0.3]],
    }
    return collection


@pytest.fixture()
def rag_client(mock_openai, mock_collection):
    """TestClient for the RAG router with mocked external services."""
    rag_search._openai_client = None
    rag_search._chroma_client = None

    app = FastAPI()
    app.include_router(rag_router)

    with patch.object(rag_search, "_get_openai", return_value=mock_openai), \
         patch.object(rag_search, "_get_chroma_collection", return_value=mock_collection):
        yield TestClient(app)

    rag_search._openai_client = None
    rag_search._chroma_client = None


class TestRagSearchEndpoint:
    def test_returns_200(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "бургер"})
        assert resp.status_code == 200

    def test_returns_query_echo(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "бургер"})
        assert resp.json()["query"] == "бургер"

    def test_returns_results(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "бургер"})
        results = resp.json()["results"]
        assert len(results) == 2

    def test_result_fields(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "бургер"})
        item = resp.json()["results"][0]
        assert "restaurant" in item
        assert "image_id" in item
        assert "s3_key" in item
        assert "raw_text" in item
        assert "score" in item

    def test_score_is_1_minus_distance(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "бургер"})
        results = resp.json()["results"]
        assert results[0]["score"] == round(1 - 0.1, 4)
        assert results[1]["score"] == round(1 - 0.3, 4)

    def test_raw_text_truncated_to_500(self, rag_client, mock_collection):
        long_text = "A" * 1000
        mock_collection.query.return_value["documents"] = [[long_text, long_text]]
        resp = rag_client.get("/rag/search", params={"query": "test"})
        raw = resp.json()["results"][0]["raw_text"]
        assert len(raw) <= 500

    def test_top_k_parameter(self, rag_client, mock_openai, mock_collection):
        rag_client.get("/rag/search", params={"query": "test", "top_k": 3})
        mock_collection.query.assert_called_once()
        call_kwargs = mock_collection.query.call_args
        assert call_kwargs.kwargs["n_results"] == 3

    def test_missing_query_returns_422(self, rag_client):
        resp = rag_client.get("/rag/search")
        assert resp.status_code == 422

    def test_top_k_validation(self, rag_client):
        resp = rag_client.get("/rag/search", params={"query": "test", "top_k": 0})
        assert resp.status_code == 422

        resp = rag_client.get("/rag/search", params={"query": "test", "top_k": 51})
        assert resp.status_code == 422
