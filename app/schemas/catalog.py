from pydantic import BaseModel


class RestaurantOut(BaseModel):
    id: int
    name: str


class DishOut(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: str | None = None
    price: float | None = None
    calories: float | None = None
    protein: float | None = None
    fat: float | None = None
    carbs: float | None = None