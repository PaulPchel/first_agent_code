"""Menu parsing pipeline orchestrator.

Usage:
    python -m app.scripts.pipeline.run <csv_path> [--dry-run] [--stage fetch|extract|structure|load]

Examples:
    # Full pipeline (S3 cache is used automatically when S3_BUCKET is set)
    python -m app.scripts.pipeline.run data/restaurants.csv

    # Only fetch menus (no LLM calls)
    python -m app.scripts.pipeline.run data/restaurants.csv --stage fetch

    # Full pipeline, dry run (no DB writes)
    python -m app.scripts.pipeline.run data/restaurants.csv --dry-run

    # Local-only mode (skip S3, useful for offline dev)
    python -m app.scripts.pipeline.run data/restaurants.csv --local-only

    # Clean local cache after run
    python -m app.scripts.pipeline.run data/restaurants.csv --clean
"""

from __future__ import annotations

import argparse
import time


def main() -> None:
    parser = argparse.ArgumentParser(description="Restaurant menu parsing pipeline")
    parser.add_argument("csv_path", help="Path to the restaurants CSV file")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to database")
    parser.add_argument(
        "--stage",
        choices=["fetch", "extract", "structure", "load"],
        help="Run only up to this stage",
    )
    parser.add_argument("--replace", action="store_true", help="Clear all existing DB data before loading")
    parser.add_argument("--local-only", action="store_true", help="Skip S3, use local cache only")
    parser.add_argument("--clean", action="store_true", help="Delete local cache after run")
    args = parser.parse_args()

    from app.scripts.pipeline import cache
    if args.local_only:
        cache.set_local_only(True)

    t0 = time.time()

    # --- Stage 1: Fetch ---
    print("=" * 60)
    print("STAGE 1: Fetching menus")
    print("=" * 60)
    from app.scripts.pipeline.fetch_menus import fetch_all
    fetched = fetch_all(args.csv_path)

    if args.stage == "fetch":
        print(f"\nStopped after fetch stage. Elapsed: {time.time() - t0:.1f}s")
        if args.clean:
            cache.clean_local()
        return

    # --- Stage 2: Extract text ---
    print("\n" + "=" * 60)
    print("STAGE 2: Extracting text")
    print("=" * 60)
    from app.scripts.pipeline.extract_text import extract_all
    extracted = extract_all(fetched)

    if args.stage == "extract":
        print(f"\nStopped after extract stage. Elapsed: {time.time() - t0:.1f}s")
        if args.clean:
            cache.clean_local()
        return

    # --- Stage 3: Structure dishes ---
    print("\n" + "=" * 60)
    print("STAGE 3: Structuring dishes (LLM)")
    print("=" * 60)
    from app.scripts.pipeline.structure_dishes import structure_all
    structured = structure_all(extracted)

    if args.stage == "structure":
        print(f"\nStopped after structure stage. Elapsed: {time.time() - t0:.1f}s")
        if args.clean:
            cache.clean_local()
        return

    # --- Stage 4: Load into database ---
    print("\n" + "=" * 60)
    print("STAGE 4: Loading into database")
    print("=" * 60)
    from app.scripts.pipeline.load_dishes import load_all
    stats = load_all(structured, dry_run=args.dry_run, replace=args.replace)

    print(f"\n{'=' * 60}")
    print("PIPELINE COMPLETE")
    print(f"{'=' * 60}")
    if stats.get("old_restaurants_removed"):
        print(f"  Old data cleared:    {stats['old_restaurants_removed']} restaurants, {stats['old_dishes_removed']} dishes")
    print(f"  Restaurants created:  {stats['restaurants_created']}")
    print(f"  Restaurants existing: {stats['restaurants_existing']}")
    print(f"  Dishes upserted:     {stats['dishes_upserted']}")
    print(f"  Dishes skipped:      {stats['dishes_skipped']} (no calories)")
    print(f"  Elapsed:             {time.time() - t0:.1f}s")

    if args.clean:
        cache.clean_local()


if __name__ == "__main__":
    main()
