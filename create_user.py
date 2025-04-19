from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Table, MetaData
from sqlalchemy.sql import func
import sys

# Настройка соединения
engine = create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})
metadata = MetaData()

# Определение таблицы пользователей напрямую через MetaData
users = Table(
    "users", 
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("username", String, unique=True, index=True),
    Column("email", String, unique=True, index=True),
    Column("hashed_password", String),
    Column("is_active", Boolean, default=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), onupdate=func.now())
)

# Создание таблицы если не существует
metadata.create_all(engine)
print("Таблица users создана или уже существует")

# Вставка тестового пользователя
from sqlalchemy.sql import insert
from datetime import datetime

# Пароль 'test123' хеширован с bcrypt
hashed_password = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

# Добавление тестового пользователя
with engine.connect() as conn:
    try:
        stmt = insert(users).values(
            username="testuser",
            email="test@example.com",
            hashed_password=hashed_password,
            is_active=True,
            created_at=datetime.now()
        )
        result = conn.execute(stmt)
        conn.commit()
        print(f"Пользователь добавлен с ID: {result.lastrowid}")
    except Exception as e:
        print(f"Ошибка при добавлении пользователя: {e}")

# Проверка содержимого таблицы
from sqlalchemy.sql import select

with engine.connect() as conn:
    query = select(users)
    result = conn.execute(query)
    print("\nПользователи в базе данных:")
    for row in result:
        print(f"ID: {row[0]}, Имя: {row[1]}, Email: {row[2]}, Активен: {row[4]}") 