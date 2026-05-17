from pydantic import BaseModel


class RestaurantOut(BaseModel):
    id: int
    name: str
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    emoji: str | None = None
    rating: float | None = None
    distance_km: float | None = None


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