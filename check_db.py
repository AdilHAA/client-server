import sqlite3

# Подключаемся к базе данных
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Получаем список всех таблиц
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Таблицы в базе данных:")
for table in tables:
    print(f"- {table[0]}")

# Просматриваем данные в таблице users
print("\nСодержимое таблицы users:")
try:
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    
    # Получаем имена столбцов
    cursor.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cursor.fetchall()]
    print(f"Столбцы: {columns}")
    
    # Выводим данные
    if users:
        for user in users:
            print(f"Пользователь: {user}")
    else:
        print("В таблице users нет данных")
except Exception as e:
    print(f"Ошибка при чтении таблицы users: {e}")

# Закрываем соединение
conn.close() 