import sqlite3
import json

# Подключение к базе данных
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Получение списка всех таблиц
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Таблицы в базе данных:")
for table in tables:
    print(f"- {table[0]}")
print()

# Проверка количества сообщений
cursor.execute("SELECT COUNT(*) FROM messages")
message_count = cursor.fetchone()[0]
print(f"Количество сообщений в базе данных: {message_count}")

# Проверка количества чатов
cursor.execute("SELECT COUNT(*) FROM chats")
chat_count = cursor.fetchone()[0]
print(f"Количество чатов в базе данных: {chat_count}")

# Если есть сообщения, показать последние 5
if message_count > 0:
    cursor.execute("""
    SELECT m.id, m.chat_id, m.role, m.content, m.created_at, m.is_voice, c.title 
    FROM messages m
    JOIN chats c ON m.chat_id = c.id
    ORDER BY m.created_at DESC LIMIT 5
    """)
    recent_messages = cursor.fetchall()
    print("\nПоследние сообщения:")
    for msg in recent_messages:
        print(f"ID: {msg[0]}, Chat: {msg[1]} ({msg[6]}), Role: {msg[2]}, Content: {msg[3][:30]}..., Created: {msg[4]}")

# Закрытие соединения
conn.close() 