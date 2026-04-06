from app.db.models import Food

def seed_database(db):
    existing = db.query(Food).first()

    if existing:
        return

    foods = [
        Food(name="Chicken Burger", calories=300, protein=20, fat=15, carbs=25),
        Food(name="Burger", calories=250, protein=12, fat=10, carbs=30),
        Food(name="Fries", calories=400, protein=4, fat=20, carbs=50),
        Food(name="Coca Cola", calories=140, protein=0, fat=0, carbs=39),
        Food(name="Salad", calories=120, protein=5, fat=3, carbs=10),
        Food(name="Pizza", calories=500, protein=22, fat=18, carbs=60),
    ]

    db.add_all(foods)
    db.commit()