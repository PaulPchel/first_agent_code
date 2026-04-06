from app.utils.text import normalize
from app.utils.similarity import levenshtein


def word_similarity(w1: str, w2: str) -> float:
    distance = levenshtein(w1, w2)
    max_len = max(len(w1), len(w2))

    if max_len == 0:
        return 1.0

    return 1 - distance / max_len


def score(query: str, target: str) -> float:
    query_words = normalize(query)
    target_words = normalize(target)

    total_score = 0

    for qw in query_words:
        best = 0
        for tw in target_words:
            sim = word_similarity(qw, tw)
            best = max(best, sim)

        total_score += best

    return total_score / max(len(query_words), 1)