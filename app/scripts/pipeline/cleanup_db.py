"""One-time cleanup for existing DB data: normalize names, fix toppings, remove duplicates.

Usage:
    python -m app.scripts.pipeline.cleanup_db [--dry-run]
"""

from __future__ import annotations

import argparse
import re

from app.scripts.pipeline.structure_dishes import _normalize_dish_name


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean up dish names in the database")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without applying")
    args = parser.parse_args()

    from app.db.database import SessionLocal
    from app.db.models import Dish

    db = SessionLocal()
    stats = {"renamed": 0, "toppings_fixed": 0, "duplicates_removed": 0}

    try:
        all_dishes = db.query(Dish).all()
        print(f"Total dishes in DB: {len(all_dishes)}\n")

        # Pass 1: normalize names (CAPS + topping prefixes)
        print("--- Pass 1: Normalizing dish names ---")
        for dish in all_dishes:
            new_name = _normalize_dish_name(dish.dish_name)
            if new_name != dish.dish_name:
                is_topping = "(топпинг)" in new_name and "(топпинг)" not in dish.dish_name
                if is_topping:
                    stats["toppings_fixed"] += 1
                else:
                    stats["renamed"] += 1
                print(f"  {dish.dish_name!r} -> {new_name!r}")
                dish.dish_name = new_name

        # Pass 2: remove duplicates (same restaurant_id + lowercase name + calories)
        print("\n--- Pass 2: Removing duplicates ---")
        seen: set[tuple[int, str, float | None]] = set()
        to_delete: list[int] = []
        for dish in sorted(all_dishes, key=lambda d: d.id):
            key = (dish.restaurant_id, dish.dish_name.lower().strip(), dish.calories)
            if key in seen:
                to_delete.append(dish.id)
                print(f"  dup: id={dish.id} {dish.dish_name!r} ({dish.calories} kcal) in restaurant_id={dish.restaurant_id}")
            else:
                seen.add(key)

        stats["duplicates_removed"] = len(to_delete)
        if to_delete:
            db.query(Dish).filter(Dish.id.in_(to_delete)).delete(synchronize_session="fetch")

        print(f"\n--- Summary ---")
        print(f"  Names normalized:    {stats['renamed']}")
        print(f"  Toppings fixed:      {stats['toppings_fixed']}")
        print(f"  Duplicates removed:  {stats['duplicates_removed']}")

        if args.dry_run:
            print("\n  DRY RUN — rolling back")
            db.rollback()
        else:
            db.commit()
            print("\n  Changes committed.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
