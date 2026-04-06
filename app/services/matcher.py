from app.utils.text import normalize

def simple_score(query: str, target: str) -> int:
    query_words = set(normalize(query).split())
    target_words = set(normalize(target).split())

    return len(query_words & target_words)