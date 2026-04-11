"""Tests for app/utils/text.py and app/utils/similarity.py"""

from app.utils.text import normalize
from app.utils.similarity import levenshtein


# ── levenshtein ──────────────────────────────────────────────

class TestLevenshtein:
    def test_identical_strings(self):
        assert levenshtein("hello", "hello") == 0

    def test_empty_strings(self):
        assert levenshtein("", "") == 0

    def test_one_empty(self):
        assert levenshtein("abc", "") == 3
        assert levenshtein("", "abc") == 3

    def test_single_insertion(self):
        assert levenshtein("cat", "cats") == 1

    def test_single_substitution(self):
        assert levenshtein("cat", "bat") == 1

    def test_single_deletion(self):
        assert levenshtein("cats", "cat") == 1

    def test_completely_different(self):
        assert levenshtein("abc", "xyz") == 3

    def test_symmetric(self):
        assert levenshtein("kitten", "sitting") == levenshtein("sitting", "kitten")

    def test_known_distance(self):
        assert levenshtein("kitten", "sitting") == 3

    def test_cyrillic(self):
        assert levenshtein("бургер", "бургер") == 0
        assert levenshtein("бургер", "бургерчик") == 3


# ── normalize ────────────────────────────────────────────────

class TestNormalize:
    def test_lowercases_text(self):
        words = normalize("HELLO")
        assert "hello" in words

    def test_strips_punctuation(self):
        words = normalize("hello, world!")
        assert all(w.isalnum() for w in words)

    def test_expands_english_synonym_to_include_key(self):
        words = normalize("бургер")
        assert "burger" in words
        assert "бургер" in words

    def test_expands_key_to_include_self(self):
        words = normalize("burger")
        assert "burger" in words

    def test_cyrillic_preserved(self):
        words = normalize("куриный салат")
        assert "куриный" in words
        assert "салат" in words

    def test_synonym_expansion_fries(self):
        words = normalize("картошка")
        assert "fries" in words
        assert "картошка" in words

    def test_no_duplicates(self):
        words = normalize("burger burger")
        assert len(words) == len(set(words))

    def test_unknown_word_passes_through(self):
        words = normalize("sushi")
        assert "sushi" in words

    def test_returns_list(self):
        result = normalize("test")
        assert isinstance(result, list)
