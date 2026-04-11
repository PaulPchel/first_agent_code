from sqlalchemy import Column, Float, Integer, String
from app.db.base import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    calories = Column(Integer)
    protein = Column(Integer)
    fat = Column(Integer)
    carbs = Column(Integer)


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    restaurant = Column(String, index=True)
    dish_name = Column(String, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    s3_key = Column(String, nullable=True)
    run_id = Column(String, nullable=True, index=True)