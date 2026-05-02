"""Stage 3: Use LLM to parse raw menu text into structured dish JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

from openai import OpenAI
from pydantic import ValidationError

from app.scripts.pipeline import cache
from app.scripts.pipeline.config import OPENAI_API_KEY
from app.scripts.pipeline.models import ParsedDish, RestaurantEntry

_KEEP_UPPER = {"BBQ", "DOP", "VSOP", "AVA", "XO", "IPA", "ABV", "NYC"}


def _normalize_dish_name(name: str) -> str:
    """Normalize a dish name: handle topping prefixes and ALL-CAPS."""
    name = name.strip()

    m = re.match(r"^[ТтTt]_\s*(.+)$", name)
    if not m:
        m = re.match(r"^ТОП_\s*(.+)$", name, re.IGNORECASE)
    if m:
        inner = m.group(1).strip()
        return f"{_title_case(inner)} (топпинг)"

    letters = [c for c in name if c.isalpha()]
    if letters and len(letters) > 3 and sum(c.isupper() for c in letters) / len(letters) > 0.7:
        return _title_case(name)

    return name


def _title_case(text: str) -> str:
    """Title-case that preserves known acronyms."""
    words = text.split()
    result = []
    for i, w in enumerate(words):
        if w.upper() in _KEEP_UPPER:
            result.append(w.upper())
        elif i == 0:
            result.append(w.capitalize())
        else:
            result.append(w.lower())
    return " ".join(result)


def _dedupe_dishes(dishes: list[ParsedDish]) -> list[ParsedDish]:
    """Remove duplicate dishes with the same name and calories."""
    seen: set[tuple[str, float | None]] = set()
    out: list[ParsedDish] = []
    for d in dishes:
        key = (d.dish_name.lower().strip(), d.calories)
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return out

STRUCTURE_PROMPT = """\
You are given raw text extracted from a restaurant menu that includes calorie information.
Parse it into a JSON object with a single key "dishes" containing an array.
Each dish element must have these fields (use null if not present):
- dish_name (string, required) — keep in original language, use proper title case
- description (string or null)
- price (number or null, in rubles)
- calories (number or null, kcal)
- protein (number or null, grams)
- fat (number or null, grams)
- carbs (number or null, grams)

Rules:
- Skip section headers (e.g. "ОВОЩИ", "НАПИТКИ") that are not dishes.
- Skip items that are clearly not food (e.g. "Хлебная корзина" without calories).
- If the text contains КБЖУ / КБЖ / nutrition info, extract all available macros.
- Calories may appear as kcal, ккал, or just a number near the dish.
- If a dish name is in ALL CAPS, convert it to normal title case (e.g. "ГУАКАМОЛЕ" -> "Гуакамоле"). \
Preserve well-known acronyms (BBQ, DOP, VSOP).
- If a line is prefixed with "Т_", "T_", or "ТОП_", it is a topping/add-on. \
Rewrite the name as "<Name> (топпинг)" in title case (e.g. "Т_ГУАКАМОЛЕ" -> "Гуакамоле (топпинг)").
- If a section heading says "ТОППИНГИ", "ДОБАВКИ", "ADD-ONS", or similar, \
treat all items in that section as toppings and append " (топпинг)" to their names.
- Do NOT include duplicate dishes. If the same dish name with the same calories appears \
multiple times, include it only once.
- Return ONLY a valid JSON object {"dishes": [...]}."""

MAX_TEXT_PER_CALL = 6000  # chars; smaller chunks = fewer dishes per LLM response


def _salvage_truncated_json(content: str) -> list[dict]:
    """Try to extract complete dish objects from a truncated JSON array."""
    import re
    objects: list[dict] = []
    for m in re.finditer(r'\{[^{}]+\}', content):
        try:
            obj = json.loads(m.group())
            if "dish_name" in obj:
                objects.append(obj)
        except json.JSONDecodeError:
            continue
    return objects


def _chunk_text(text: str, max_chars: int = MAX_TEXT_PER_CALL) -> list[str]:
    """Split text into chunks at paragraph boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    paragraphs = text.split("\n\n")
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) > max_chars and current:
            chunks.append("\n\n".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += len(para) + 2

    if current:
        chunks.append("\n\n".join(current))

    return chunks


def _call_llm(text: str, client: OpenAI) -> list[dict]:
    """Send text to LLM and parse the JSON response."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": STRUCTURE_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        max_tokens=16384,
        temperature=0.1,
    )

    content = response.choices[0].message.content
    if not content:
        return []

    try:
        parsed = json.loads(content.strip())
    except json.JSONDecodeError:
        dishes = _salvage_truncated_json(content)
        if dishes:
            print(f"    salvaged {len(dishes)} dishes from truncated JSON")
            return dishes
        print(f"    WARNING: invalid JSON from LLM: {content[:200]}")
        return []

    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list):
                return value
    return []


def _validate_dishes(raw_dishes: list[dict]) -> list[ParsedDish]:
    """Validate, normalize names, and deduplicate dishes."""
    valid: list[ParsedDish] = []
    for d in raw_dishes:
        try:
            dish = ParsedDish(**d)
            if not dish.dish_name or not dish.dish_name.strip():
                continue
            dish.dish_name = _normalize_dish_name(dish.dish_name)
            if not dish.dish_name:
                continue
            if dish.calories is not None and dish.calories > 10000:
                print(f"    WARNING: suspicious calories ({dish.calories}) for {dish.dish_name}, dropping")
                continue
            valid.append(dish)
        except ValidationError:
            continue
    return _dedupe_dishes(valid)


def structure_menu(
    entry: RestaurantEntry,
    text_path: Path,
    client: OpenAI,
) -> list[ParsedDish]:
    """Structure a single restaurant's menu text into validated dishes."""
    cache_filename = f"{text_path.stem}.json"

    cached = cache.get("structured", cache_filename)
    if cached:
        try:
            data = json.loads(cached.read_text(encoding="utf-8"))
            return [ParsedDish(**d) for d in data]
        except (json.JSONDecodeError, ValidationError):
            pass

    text = text_path.read_text(encoding="utf-8")
    chunks = _chunk_text(text)

    all_raw: list[dict] = []
    for i, chunk in enumerate(chunks):
        if len(chunks) > 1:
            print(f"    chunk {i + 1}/{len(chunks)} ({len(chunk)} chars)...", end=" ", flush=True)
        raw = _call_llm(chunk, client)
        if len(chunks) > 1:
            print(f"{len(raw)} dishes")
        all_raw.extend(raw)

    dishes = _validate_dishes(all_raw)

    if dishes:
        json_str = json.dumps([d.model_dump() for d in dishes], ensure_ascii=False, indent=2)
        cache.put_text("structured", cache_filename, json_str)

    return dishes


def structure_all(
    entries_with_text: list[tuple[RestaurantEntry, Path | None]],
) -> list[tuple[RestaurantEntry, list[ParsedDish]]]:
    """Run LLM structuring on all extracted texts."""
    client = OpenAI(api_key=OPENAI_API_KEY)

    results = []
    total = len(entries_with_text)

    for i, (entry, text_path) in enumerate(entries_with_text, 1):
        print(f"  [{i}/{total}] {entry.name}")

        if not text_path:
            print("    skipped (no text)")
            results.append((entry, []))
            continue

        dishes = structure_menu(entry, text_path, client)
        with_cal = sum(1 for d in dishes if d.calories is not None)
        print(f"    -> {len(dishes)} dishes ({with_cal} with calories)")

        results.append((entry, dishes))

    total_dishes = sum(len(d) for _, d in results)
    total_with_cal = sum(
        sum(1 for d in dishes if d.calories is not None)
        for _, dishes in results
    )
    print(f"\nStructured {total_dishes} total dishes ({total_with_cal} with calories)")
    return results
