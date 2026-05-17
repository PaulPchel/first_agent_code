import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.catalog_service import CatalogService
from app.services.twogis_service import sync_all_restaurants, sync_restaurant

router = APIRouter(prefix="/restaurants", tags=["restaurants"])

EARTH_RADIUS_KM = 6371.0


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = la2 - la1
    dlon = lo2 - lo1
    a = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


def _restaurant_dict(
    r,
    user_lat: float | None = None,
    user_lon: float | None = None,
    avg_cal: float | None = None,
) -> dict:
    d: dict = {
        "id": r.id,
        "name": r.name,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "address": r.address,
        "emoji": r.emoji,
        "rating": r.rating,
        "distance_km": None,
        "avg_calories": avg_cal,
    }
    if user_lat is not None and user_lon is not None and r.latitude and r.longitude:
        d["distance_km"] = round(haversine_km(user_lat, user_lon, r.latitude, r.longitude), 2)
    return d


@router.get("")
def get_restaurants(
    query: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    service = CatalogService(db)
    items = service.list_restaurants(query=query, limit=limit)
    avg_cals = service.avg_calories_by_restaurant()
    results = [_restaurant_dict(r, lat, lon, avg_cals.get(r.id)) for r in items]
    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float("inf"))
    return {"count": len(results), "results": results}


@router.post("/sync-2gis")
def sync_2gis(db: Session = Depends(get_db)):
    """Sync all restaurants with 2GIS Places API (coordinates + rating)."""
    results = sync_all_restaurants(db)
    updated = sum(1 for r in results if r["status"] == "updated")
    return {"synced": len(results), "updated": updated, "results": results}


@router.post("/{restaurant_id}/sync-2gis")
def sync_single_2gis(restaurant_id: int, db: Session = Depends(get_db)):
    """Sync a single restaurant with 2GIS."""
    service = CatalogService(db)
    r = service.get_restaurant(restaurant_id)
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    result = sync_restaurant(db, r)
    db.commit()
    return result


@router.get("/{restaurant_id}")
def get_restaurant(
    restaurant_id: int,
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    db: Session = Depends(get_db),
):
    service = CatalogService(db)
    r = service.get_restaurant(restaurant_id)
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return _restaurant_dict(r, lat, lon)