from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sys

SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Import models to ensure they're registered with Base
from app.models.user import User
from app.models.chat import Chat, Message

def create_tables():
    print("Создание таблиц в базе данных...", file=sys.stderr)
    Base.metadata.create_all(bind=engine)
    print("Таблицы успешно созданы!", file=sys.stderr)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 