import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.search import router as search_router
from app.api.rag_search import router as rag_router
from app.db.database import SessionLocal, engine
from app.db.base import Base
from app.db.seed import seed_database
from app.api.restaurants import router as restaurants_router
from app.api.dishes import router as dishes_router
from app.api.user import router as user_router

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Restaurant Nutrition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(rag_router)
app.include_router(restaurants_router)
app.include_router(dishes_router)
app.include_router(user_router)

@app.on_event("startup")
def startup():
    db = SessionLocal()
    seed_database(db)
    db.close()

@app.get("/")
def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")