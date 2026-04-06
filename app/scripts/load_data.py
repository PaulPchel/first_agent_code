from app.db.database import SessionLocal
from app.db.seed import seed_database

def run():
    db = SessionLocal()
    seed_database(db)
    db.close()

if __name__ == "__main__":
    run()