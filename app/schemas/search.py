from pydantic import BaseModel
from typing import List


class Dish(BaseModel):
    name: str
    calories: float
    protein: float
    fat: float
    carbs: float
    score: float


class SearchResponse(BaseModel):
    results: List[Dish]