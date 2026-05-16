from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from app.db.base import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    emoji = Column(String, nullable=True)
    rating = Column(Float, nullable=True)


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    dish_name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)


class UserState(Base):
    __tablename__ = "user_state"

    user_id = Column(String, primary_key=True, index=True)
    selected_restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True, index=True)
    selected_dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=True, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())