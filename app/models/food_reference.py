from sqlalchemy import Column, Integer, String, Float
from app.db.base import Base

class FoodReference(Base):
    __tablename__ = "food_reference"

    id = Column(Integer, primary_key=True)
    name = Column(String)

    calories = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)