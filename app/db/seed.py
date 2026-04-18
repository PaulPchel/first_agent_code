from app.db.models import Dish, Restaurant

def seed_database(db):
    if db.query(Restaurant).first():
        return

    r1 = Restaurant(name="Burger King")
    r2 = Restaurant(name="Теремок")

    db.add_all([r1, r2])
    db.flush()

    dishes = [
        Dish(
            restaurant_id=r1.id,
            dish_name="Whopper",
            description="Beef burger",
            price=350,
            calories=660,
            protein=28,
            fat=40,
            carbs=49,
        ),
        Dish(
            restaurant_id=r1.id,
            dish_name="Fries",
            description="French fries",
            price=150,
            calories=380,
            protein=4,
            fat=18,
            carbs=50,
        ),
        Dish(
            restaurant_id=r2.id,
            dish_name="Борщ",
            description="Суп с говядиной",
            price=290,
            calories=320,
            protein=12,
            fat=15,
            carbs=28,
        ),
        Dish(
            restaurant_id=r2.id,
            dish_name="Блин с курицей",
            description="Блин с начинкой",
            price=350,
            calories=450,
            protein=25,
            fat=20,
            carbs=35,
        ),
    ]

    db.add_all(dishes)
    db.commit()