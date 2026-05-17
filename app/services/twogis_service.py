import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger(__name__)

TWOGIS_BASE_URL = "https://catalog.api.2gis.com/3.0/items"


@dataclass
class TwoGisPlaceInfo:
    latitude: float
    longitude: float
    rating: float | None


def _get_api_key() -> str:
    key = os.getenv("TWOGIS_API_KEY", "")
    if not key:
        raise RuntimeError("TWOGIS_API_KEY is not set")
    return key


def lookup_place(name: str, address: str | None = None) -> TwoGisPlaceInfo | None:
    """Search 2GIS Places API by restaurant name (+ optional address for precision).

    Returns precise coordinates and rating, or None if no match found.
    """
    query = f"{name} {address}" if address else name

    params = {
        "q": query,
        "fields": "items.point,items.reviews",
        "type": "branch",
        "page_size": 1,
        "key": _get_api_key(),
    }

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(TWOGIS_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        logger.warning("2GIS API request failed for %r: %s", name, e)
        return None

    items = data.get("result", {}).get("items", [])
    if not items:
        logger.info("2GIS: no results for %r", query)
        return None

    item = items[0]

    point = item.get("point")
    if not point:
        logger.info("2GIS: no coordinates for %r", name)
        return None

    rating = None
    reviews = item.get("reviews")
    if reviews and isinstance(reviews, dict):
        rating = reviews.get("rating")

    return TwoGisPlaceInfo(
        latitude=point["lat"],
        longitude=point["lon"],
        rating=float(rating) if rating is not None else None,
    )


def sync_restaurant(db_session, restaurant) -> dict:
    """Look up a single restaurant on 2GIS and update its DB record.

    Returns a status dict for logging/reporting.
    """
    info = lookup_place(restaurant.name, restaurant.address)

    if info is None:
        return {"id": restaurant.id, "name": restaurant.name, "status": "not_found"}

    restaurant.latitude = info.latitude
    restaurant.longitude = info.longitude
    if info.rating is not None:
        restaurant.rating = info.rating

    return {
        "id": restaurant.id,
        "name": restaurant.name,
        "status": "updated",
        "latitude": info.latitude,
        "longitude": info.longitude,
        "rating": info.rating,
    }


def sync_all_restaurants(db_session) -> list[dict]:
    """Sync all restaurants in the DB with 2GIS data."""
    from app.db.models import Restaurant

    restaurants = db_session.query(Restaurant).all()
    results = []

    for r in restaurants:
        result = sync_restaurant(db_session, r)
        results.append(result)
        logger.info("2GIS sync: %s — %s", r.name, result["status"])

    db_session.commit()
    return results
