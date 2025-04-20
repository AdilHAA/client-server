import requests
import json
from datetime import datetime
import sys

BASE_URL = "http://localhost:8080"

def login():
    """Получение токена аутентификации"""
    login_url = f"{BASE_URL}/auth/token"
    
    # Замените на свои учетные данные
    data = {
        "username": "admin",
        "password": "admin"
    }
    
    response = requests.post(login_url, data=data)
    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    else:
        print(f"Ошибка аутентификации: {response.status_code}")
        print(response.text)
        return None

def get_chat_messages(chat_id, token):
    """Получение сообщений чата"""
    url = f"{BASE_URL}/chat/{chat_id}/messages"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print(f"Статус запроса сообщений: {response.status_code}")
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения сообщений: {response.text}")
        return []

def check_response_structure(messages):
    """Проверка структуры ответа на соответствие ожиданиям"""
    if not isinstance(messages, list):
        print(f"ОШИБКА: Ответ не является списком. Тип: {type(messages)}")
        return False
    
    print(f"Количество сообщений в ответе: {len(messages)}")
    
    if not messages:
        print("Список сообщений пуст")
        return True
    
    # Проверка полей первого сообщения
    first_message = messages[0]
    required_fields = ["id", "role", "content", "created_at", "chat_id", "is_voice"]
    
    print("\nСтруктура первого сообщения:")
    for field in required_fields:
        if field in first_message:
            print(f"✓ {field}: {first_message[field]}")
        else:
            print(f"✗ {field}: отсутствует")
    
    # Проверка типа данных created_at
    if "created_at" in first_message:
        try:
            datetime.fromisoformat(first_message["created_at"].replace("Z", "+00:00"))
            print("✓ created_at имеет правильный ISO формат")
        except ValueError:
            print(f"✗ created_at имеет неправильный формат: {first_message['created_at']}")
    
    return True

def main():
    token = login()
    if not token:
        print("Не удалось получить токен. Выход.")
        sys.exit(1)
    
    print(f"Токен получен: {token[:10]}...")
    
    # Проверка для чата с ID 4
    chat_id = 4  # Замените на ID вашего чата
    print(f"\nПроверка сообщений для чата ID {chat_id}")
    
    messages = get_chat_messages(chat_id, token)
    check_response_structure(messages)

if __name__ == "__main__":
    main() 