from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.search import router as search_router
from app.api.rag_search import router as rag_router
from app.db.database import SessionLocal, engine
from app.db.base import Base
from app.db.seed import seed_database

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

@app.on_event("startup")
def startup():
    db = SessionLocal()
    seed_database(db)
    db.close()

@app.get("/")
def root():
    return {"message": "API is running"}