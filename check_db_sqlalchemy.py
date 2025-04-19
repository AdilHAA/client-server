from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
import os

print(f"Текущая директория: {os.getcwd()}")
print(f"Проверка существования файла БД: {os.path.exists('app.db')}")

# Настройка соединения с базой данных
engine = create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)
session = Session()

# Получение инспектора для исследования базы данных
inspector = inspect(engine)

# Получение списка всех таблиц
table_names = inspector.get_table_names()
print(f"Таблицы в базе данных: {table_names}")

# Если таблицы есть, выводим их схему и содержимое
for table_name in table_names:
    print(f"\n== Таблица: {table_name} ==")
    
    # Получаем информацию о столбцах
    columns = inspector.get_columns(table_name)
    print("Столбцы:")
    for column in columns:
        print(f"  - {column['name']} ({column['type']})")
    
    # Получаем первые 5 строк данных
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 5"))
        rows = result.fetchall()
        
        print(f"\nДанные (первые 5 строк):")
        if rows:
            column_names = [c['name'] for c in columns]
            for row in rows:
                values = [f"{col}: {val}" for col, val in zip(column_names, row)]
                print(f"  {', '.join(values)}")
        else:
            print("  Нет данных")

# Закрываем сессию
session.close() 