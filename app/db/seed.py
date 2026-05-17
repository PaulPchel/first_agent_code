from app.db.models import Dish, Restaurant


def seed_database(db):
    if db.query(Restaurant).first():
        return

    restaurants = [
        Restaurant(
            name="Burger King",
            latitude=55.7558,
            longitude=37.6173,
            address="ул. Тверская, 6",
            emoji="🍔",
            rating=4.1,
        ),
        Restaurant(
            name="Теремок",
            latitude=55.7601,
            longitude=37.6186,
            address="ул. Большая Дмитровка, 7/5",
            emoji="🥞",
            rating=4.5,
        ),
        Restaurant(
            name="Чайхона №1",
            latitude=55.7490,
            longitude=37.6055,
            address="ул. Остоженка, 3/14",
            emoji="🍲",
            rating=4.6,
        ),
        Restaurant(
            name="Му-Му",
            latitude=55.7612,
            longitude=37.6090,
            address="ул. Тверская, 24",
            emoji="🥗",
            rating=4.3,
        ),
        Restaurant(
            name="KFC",
            latitude=55.7530,
            longitude=37.6225,
            address="Новая пл., 8",
            emoji="🍗",
            rating=3.9,
        ),
        Restaurant(
            name="Якитория",
            latitude=55.7465,
            longitude=37.6120,
            address="ул. Пречистенка, 10",
            emoji="🍣",
            rating=4.4,
        ),
    ]

    db.add_all(restaurants)
    db.flush()

    dishes = [
        Dish(restaurant_id=restaurants[0].id, dish_name="Whopper", description="Beef burger", price=350, calories=660, protein=28, fat=40, carbs=49),
        Dish(restaurant_id=restaurants[0].id, dish_name="Fries", description="French fries", price=150, calories=380, protein=4, fat=18, carbs=50),
        Dish(restaurant_id=restaurants[1].id, dish_name="Борщ", description="Суп с говядиной", price=290, calories=320, protein=12, fat=15, carbs=28),
        Dish(restaurant_id=restaurants[1].id, dish_name="Блин с курицей", description="Блин с начинкой", price=350, calories=450, protein=25, fat=20, carbs=35),
        Dish(restaurant_id=restaurants[2].id, dish_name="Лагман", description="Густой суп с лапшой и говядиной", price=490, calories=520, protein=22, fat=18, carbs=55),
        Dish(restaurant_id=restaurants[2].id, dish_name="Плов", description="Узбекский плов с бараниной", price=450, calories=580, protein=20, fat=25, carbs=60),
        Dish(restaurant_id=restaurants[3].id, dish_name="Котлета по-киевски", description="Куриная котлета с маслом", price=320, calories=480, protein=30, fat=28, carbs=22),
        Dish(restaurant_id=restaurants[3].id, dish_name="Салат Цезарь", description="Салат с курицей и сухариками", price=380, calories=350, protein=18, fat=22, carbs=15),
        Dish(restaurant_id=restaurants[4].id, dish_name="Баскет", description="Куриные крылышки", price=350, calories=560, protein=32, fat=35, carbs=30),
        Dish(restaurant_id=restaurants[4].id, dish_name="Твистер", description="Ролл с курицей", price=250, calories=420, protein=18, fat=22, carbs=38),
        Dish(restaurant_id=restaurants[5].id, dish_name="Филадельфия", description="Ролл с лососем и сливочным сыром", price=590, calories=380, protein=16, fat=18, carbs=42),
        Dish(restaurant_id=restaurants[5].id, dish_name="Рамен", description="Японский суп с лапшой и свининой", price=520, calories=460, protein=24, fat=16, carbs=48),
    ]

    db.add_all(dishes)
    db.commit()