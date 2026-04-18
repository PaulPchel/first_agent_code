from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Dish, Restaurant
from app.schemas.user_state import SelectDishIn, SelectRestaurantIn
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["user"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/restaurant")
def select_restaurant(payload: SelectRestaurantIn, db: Session = Depends(get_db)):
    service = UserService(db)
    try:
        state = service.set_restaurant(payload.user_id, payload.restaurant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {
        "user_id": state.user_id,
        "selected_restaurant_id": state.selected_restaurant_id,
        "selected_dish_id": state.selected_dish_id,
    }


@router.post("/dish")
def select_dish(payload: SelectDishIn, db: Session = Depends(get_db)):
    service = UserService(db)
    try:
        state = service.set_dish(payload.user_id, payload.dish_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "user_id": state.user_id,
        "selected_restaurant_id": state.selected_restaurant_id,
        "selected_dish_id": state.selected_dish_id,
    }


@router.get("/state")
def get_user_state(user_id: str = Query(...), db: Session = Depends(get_db)):
    service = UserService(db)
    state = service.get_state(user_id)
    return {
        "user_id": state.user_id,
        "selected_restaurant_id": state.selected_restaurant_id,
        "selected_dish_id": state.selected_dish_id,
    }


@router.get("/result")
def get_user_result(user_id: str = Query(...), db: Session = Depends(get_db)):
    service = UserService(db)
    state = service.get_state(user_id)

    if not state.selected_restaurant_id:
        raise HTTPException(status_code=400, detail="Select restaurant first")
    if not state.selected_dish_id:
        raise HTTPException(status_code=400, detail="Select dish first")

    restaurant = db.query(Restaurant).filter(Restaurant.id == state.selected_restaurant_id).first()
    dish = db.query(Dish).filter(Dish.id == state.selected_dish_id).first()

    if not restaurant or not dish:
        raise HTTPException(status_code=404, detail="State references missing data")

    return {
        "user_id": state.user_id,
        "restaurant_id": restaurant.id,
        "restaurant_name": restaurant.name,
        "dish_id": dish.id,
        "dish_name": dish.dish_name,
        "calories": dish.calories,
        "protein": dish.protein,
        "fat": dish.fat,
        "carbs": dish.carbs,
        "price": dish.price,
    }