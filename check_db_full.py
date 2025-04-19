import sqlite3

def print_separator():
    print("\n" + "-" * 50 + "\n")

# Подключаемся к базе данных
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Получаем список всех таблиц
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Таблицы в базе данных:")
for table in tables:
    print(f"- {table[0]}")

# Для каждой таблицы выводим структуру и содержимое
for table in tables:
    table_name = table[0]
    print_separator()
    print(f"Структура таблицы {table_name}:")
    
    # Получаем информацию о столбцах
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    for col in columns:
        col_id, name, typ, notnull, default, pk = col
        print(f"  {name} ({typ})" + (" PRIMARY KEY" if pk else "") + 
              (" NOT NULL" if notnull else ""))
    
    # Получаем данные
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    print(f"\nДанные в таблице {table_name} ({len(rows)} записей):")
    if rows:
        # Получаем имена столбцов для вывода
        column_names = [col[1] for col in columns]
        print("  " + " | ".join(column_names))
        print("  " + "-" * 50)
        
        # Выводим каждую запись
        for row in rows:
            print("  " + " | ".join(str(val) for val in row))
    else:
        print("  Нет данных")

# Закрываем соединение
conn.close()

print_separator()
print("Проверка базы данных завершена.") 