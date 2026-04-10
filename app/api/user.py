from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["user"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/restaurant")
def set_restaurant(user_id: int, restaurant: str, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.set_restaurant(user_id, restaurant)
    return {"user_id": user.id, "restaurant": user.restaurant}


@router.post("/meal")
def set_meal(user_id: int, meal: str, db: Session = Depends(get_db)):
    service = UserService(db)

    try:
        user = service.set_meal(user_id, meal)
        return {"user_id": user.id, "meal": user.meal}
    except Exception as e:
        return {"error": str(e)}


@router.get("/context")
def get_context(user_id: int, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.get_user_context(user_id)

    if not user:
        return {"user_id": user_id, "restaurant": None, "meal": None}

    return {
        "user_id": user.id,
        "restaurant": user.restaurant,
        "meal": user.meal,
    }

from app.services.search_service import SearchService


@router.get("/nutrition")
def get_nutrition(user_id: int, db: Session = Depends(get_db)):
    user_service = UserService(db)
    search_service = SearchService(db)

    user = user_service.get_user_context(user_id)

    if not user or not user.meal:
        return {"error": "Сначала выбери блюдо"}

    results = search_service.search(user.meal)

    if not results:
        return {"error": "Не найдено"}

    return results[0]