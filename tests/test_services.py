"""Tests for app/services/ — SearchService, ranking, matcher."""

import pytest

from app.services.search_service import SearchService
from app.services.ranking import word_similarity, score


# ── SearchService.translate_query ────────────────────────────

class TestTranslateQuery:
    def setup_method(self):
        self.svc = SearchService(db=None)

    def test_translates_russian_word(self):
        assert self.svc.translate_query("бургер") == "burger"

    def test_translates_multiple_words(self):
        assert self.svc.translate_query("куриный бургер") == "chicken burger"

    def test_passes_through_english(self):
        assert self.svc.translate_query("pizza") == "pizza"

    def test_mixed_known_and_unknown(self):
        assert self.svc.translate_query("бургер deluxe") == "burger deluxe"

    def test_case_insensitive(self):
        assert self.svc.translate_query("Бургер") == "burger"

    def test_kola_becomes_coca_cola(self):
        assert self.svc.translate_query("кола") == "coca cola"


# ── SearchService.search ─────────────────────────────────────

class TestSearch:
    def test_finds_exact_english_match(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("burger")
        names = [r["name"] for r in results]
        assert "Burger" in names

    def test_finds_chicken_burger_via_russian(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("куриный бургер")
        names = [r["name"] for r in results]
        assert "Chicken Burger" in names

    def test_returns_nutrition_fields(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("pizza")
        assert len(results) > 0
        item = results[0]
        for key in ("name", "calories", "protein", "fat", "carbs", "score"):
            assert key in item

    def test_results_sorted_by_score_desc(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("burger")
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_no_results_for_nonsense(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("xyznonexistent")
        assert results == []

    def test_fries_via_russian(self, seeded_db):
        svc = SearchService(seeded_db)
        results = svc.search("картошка")
        names = [r["name"] for r in results]
        assert "Fries" in names


# ── ranking module ───────────────────────────────────────────

class TestWordSimilarity:
    def test_identical(self):
        assert word_similarity("burger", "burger") == 1.0

    def test_empty_strings(self):
        assert word_similarity("", "") == 1.0

    def test_completely_different(self):
        sim = word_similarity("abc", "xyz")
        assert sim == pytest.approx(0.0)

    def test_similar_words(self):
        sim = word_similarity("burger", "burgers")
        assert sim > 0.8

    def test_returns_float_between_0_and_1(self):
        sim = word_similarity("hello", "world")
        assert 0.0 <= sim <= 1.0


class TestRankingScore:
    def test_exact_match_high_score(self):
        s = score("burger", "burger")
        assert s > 0.9

    def test_partial_match(self):
        s = score("chicken burger", "chicken salad")
        assert 0.0 < s < 1.0

    def test_no_match_low_score(self):
        s = score("xyz", "burger")
        assert s < 0.5
