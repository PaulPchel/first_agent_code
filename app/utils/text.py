import re
from app.services.synonyms import SYNONYMS


def normalize(text: str) -> list:
    text = text.lower()
    text = re.sub(r"[^a-zа-я0-9\s]", "", text)

    words = text.split()
    expanded = []

    for word in words:
        expanded.append(word)

        for key, values in SYNONYMS.items():
            if word == key or word in values:
                expanded.append(key)

    return list(set(expanded))