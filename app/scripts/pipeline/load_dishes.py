"""Stage 4: Upsert structured dishes into Supabase (Postgres) via SQLAlchemy."""

from __future__ import annotations

from app.scripts.pipeline.models import ParsedDish, RestaurantEntry
from app.scripts.pipeline.structure_dishes import _dedupe_dishes, _normalize_dish_name


def load_all(
    structured: list[tuple[RestaurantEntry, list[ParsedDish]]],
    dry_run: bool = False,
    replace: bool = False,
) -> dict:
    """Upsert restaurants + dishes into the database.

    If replace=True, deletes all existing restaurants and dishes first.
    Returns stats dict with counts.
    """
    from app.db.base import Base
    from app.db.database import SessionLocal, engine
    from app.db.models import Dish, Restaurant

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    stats = {"restaurants_created": 0, "restaurants_existing": 0, "dishes_upserted": 0, "dishes_skipped": 0, "old_dishes_removed": 0, "old_restaurants_removed": 0}

    try:
        if replace:
            old_dishes = db.query(Dish).delete()
            old_restaurants = db.query(Restaurant).delete()
            db.flush()
            stats["old_dishes_removed"] = old_dishes
            stats["old_restaurants_removed"] = old_restaurants
            print(f"  Cleared {old_restaurants} restaurants and {old_dishes} dishes")

        for entry, raw_dishes in structured:
            if not raw_dishes:
                continue

            for d in raw_dishes:
                d.dish_name = _normalize_dish_name(d.dish_name)
            dishes = _dedupe_dishes(raw_dishes)

            restaurant = (
                db.query(Restaurant).filter(Restaurant.name == entry.name).first()
            )
            if not restaurant:
                restaurant = Restaurant(name=entry.name)
                db.add(restaurant)
                db.flush()
                stats["restaurants_created"] += 1
                print(f"  + Restaurant: {entry.name} (id={restaurant.id})")
            else:
                stats["restaurants_existing"] += 1
                print(f"  = Restaurant: {entry.name} (id={restaurant.id})")

            for d in dishes:
                if d.calories is None:
                    stats["dishes_skipped"] += 1
                    continue

                existing = (
                    db.query(Dish)
                    .filter(
                        Dish.restaurant_id == restaurant.id,
                        Dish.dish_name == d.dish_name,
                    )
                    .first()
                )

                if existing:
                    existing.calories = d.calories
                    existing.protein = d.protein
                    existing.fat = d.fat
                    existing.carbs = d.carbs
                    existing.price = d.price
                    existing.description = d.description
                else:
                    db.add(Dish(
                        restaurant_id=restaurant.id,
                        dish_name=d.dish_name,
                        description=d.description,
                        price=d.price,
                        calories=d.calories,
                        protein=d.protein,
                        fat=d.fat,
                        carbs=d.carbs,
                    ))
                stats["dishes_upserted"] += 1

        if dry_run:
            print("\n  DRY RUN — rolling back")
            db.rollback()
        else:
            db.commit()

    finally:
        db.close()

    return stats
