from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Nutrition(Base):
    __tablename__ = "nutritions"

    id = Column(Integer, primary_key=True)

    calories = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)

    menu_item_id = Column(Integer, ForeignKey("menu_items.id"))
    menu_item = relationship("MenuItem", back_populates="nutrition")