from pydantic import BaseModel


class SelectRestaurantIn(BaseModel):
    user_id: str
    restaurant_id: int


class SelectDishIn(BaseModel):
    user_id: str
    dish_id: int


class UserStateOut(BaseModel):
    user_id: str
    selected_restaurant_id: int | None = None
    selected_dish_id: int | None = None


class UserResultOut(BaseModel):
    user_id: str
    restaurant_id: int
    restaurant_name: str
    dish_id: int
    dish_name: str
    calories: float | None = None
    protein: float | None = None
    fat: float | None = None
    carbs: float | None = None
    price: float | None = None