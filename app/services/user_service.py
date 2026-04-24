from sqlalchemy.orm import Session

from app.db.models import Dish, Restaurant, UserState


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_state(self, user_id: str) -> UserState:
        state = self.db.query(UserState).filter(UserState.user_id == user_id).first()
        if not state:
            state = UserState(user_id=user_id)
            self.db.add(state)
            self.db.commit()
            self.db.refresh(state)
        return state

    def set_restaurant(self, user_id: str, restaurant_id: int) -> UserState:
        restaurant = self.db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if not restaurant:
            raise ValueError("Restaurant not found")

        state = self.get_or_create_state(user_id)
        state.selected_restaurant_id = restaurant_id
        state.selected_dish_id = None  # сброс блюда при смене ресторана
        self.db.commit()
        self.db.refresh(state)
        return state

    def set_dish(self, user_id: str, dish_id: int) -> UserState:
        state = self.get_or_create_state(user_id)
        if not state.selected_restaurant_id:
            raise ValueError("Select restaurant first")

        dish = self.db.query(Dish).filter(Dish.id == dish_id).first()
        if not dish:
            raise ValueError("Dish not found")
        if dish.restaurant_id != state.selected_restaurant_id:
            raise ValueError("Dish does not belong to selected restaurant")

        state.selected_dish_id = dish_id
        self.db.commit()
        self.db.refresh(state)
        return state

    def get_state(self, user_id: str) -> UserState:
        return self.get_or_create_state(user_id)