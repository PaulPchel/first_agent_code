from app.db.models import User


class UserService:
    def __init__(self, db):
        self.db = db

    def get_or_create_user(self, user_id: int):
        user = self.db.query(User).filter(User.id == user_id).first()

        if not user:
            user = User(id=user_id)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        return user

    def set_restaurant(self, user_id: int, restaurant: str):
        user = self.get_or_create_user(user_id)
        user.restaurant = restaurant
        self.db.commit()
        return user

    def set_meal(self, user_id: int, meal: str):
        user = self.get_or_create_user(user_id)

        if not user.restaurant:
            raise Exception("Сначала выбери ресторан")

        user.meal = meal
        self.db.commit()
        return user

    def get_user_context(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()