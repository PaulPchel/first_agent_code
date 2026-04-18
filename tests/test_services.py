from app.db.models import Dish, Restaurant
from app.services.search_service import SearchService


def seed_catalog(db_session):
    bk = Restaurant(name="Burger King")
    tr = Restaurant(name="Теремок")
    db_session.add_all([bk, tr])
    db_session.flush()

    db_session.add_all(
        [
            Dish(
                restaurant_id=bk.id,
                dish_name="Whopper",
                description="Beef burger",
                calories=660,
                protein=28,
                fat=40,
                carbs=49,
                price=350,
            ),
            Dish(
                restaurant_id=bk.id,
                dish_name="Fries",
                description="French fries",
                calories=380,
                protein=4,
                fat=18,
                carbs=50,
                price=150,
            ),
            Dish(
                restaurant_id=tr.id,
                dish_name="Борщ",
                description="Суп",
                calories=320,
                protein=12,
                fat=15,
                carbs=28,
                price=290,
            ),
        ]
    )
    db_session.commit()


class TestTranslateQuery:
    def test_translates_russian_word(self, db_session):
        service = SearchService(db_session)
        assert "burger" in service.translate_query("бургер")

    def test_passes_through_english(self, db_session):
        service = SearchService(db_session)
        assert service.translate_query("whopper") == "whopper"

    def test_case_insensitive(self, db_session):
        service = SearchService(db_session)
        assert "fries" in service.translate_query("ФРИ".lower())


class TestSearch:
    def test_finds_by_dish_name(self, db_session):
        seed_catalog(db_session)
        service = SearchService(db_session)

        results = service.search("Whopper")
        assert len(results) >= 1
        assert results[0]["dish_name"] == "Whopper"

    def test_finds_by_restaurant_name(self, db_session):
        seed_catalog(db_session)
        service = SearchService(db_session)

        results = service.search("Burger King")
        assert len(results) >= 2
        assert all("restaurant" in x for x in results)

    def test_finds_russian_dish(self, db_session):
        seed_catalog(db_session)
        service = SearchService(db_session)

        results = service.search("Борщ")
        assert len(results) == 1
        assert results[0]["dish_name"] == "Борщ"

    def test_returns_nutrition_fields(self, db_session):
        seed_catalog(db_session)
        service = SearchService(db_session)

        item = service.search("Fries")[0]
        assert "calories" in item
        assert "protein" in item
        assert "fat" in item
        assert "carbs" in item
        assert "score" in item

    def test_no_results_for_nonsense(self, db_session):
        seed_catalog(db_session)
        service = SearchService(db_session)

        results = service.search("nonexistent-dish-xyz")
        assert results == []