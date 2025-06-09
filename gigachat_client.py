import os
import requests
import json
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from gigachat_auth import get_access_token

# Загрузка переменных окружения
load_dotenv()

class GigaChatClient:
    """
    Клиент для работы с API GigaChat
    """
    def __init__(self):
        self.base_url = "https://gigachat.devices.sberbank.ru/api/v1"
        self.access_token = None
        self.token_expires_at = None
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def authenticate(self):
        """
        Аутентификация и получение access_token
        
        Returns:
            bool: True, если аутентификация успешна, иначе False
        """
        # Запрашиваем новый токен
        token_info = get_access_token()
        
        if token_info:
            # Извлекаем токен и время истечения
            self.access_token = token_info['access_token']
            expires_in = token_info['expires_in']
            
            # Устанавливаем заголовок авторизации
            self.headers['Authorization'] = f'Bearer {self.access_token}'
            
            # Устанавливаем время истечения токена (с небольшим запасом)
            buffer_time = min(300, expires_in * 0.1)  # 10% от времени истечения или максимум 5 минут
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - buffer_time)
            
            print(f"Токен будет действителен до: {self.token_expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
            return True
        return False
    
    def ensure_valid_token(self):
        """
        Проверяет валидность текущего токена и при необходимости обновляет его
        
        Returns:
            bool: True, если токен валиден или успешно обновлен, иначе False
        """
        # Если токен отсутствует, запрашиваем новый
        if not self.access_token or not self.token_expires_at:
            return self.authenticate()
        
        # Если токен близок к истечению, обновляем его
        if datetime.now() >= self.token_expires_at:
            print("Токен истек или скоро истечет, получаем новый...")
            return self.authenticate()
            
        return True
    
    def chat_completion(self, messages, temperature=0.7, max_tokens=1024):
        """
        Отправить запрос на генерацию ответа
        
        Args:
            messages (list): Список сообщений в формате [{role, content}, ...]
            temperature (float): Температура генерации (0.0 - 1.0)
            max_tokens (int): Максимальное количество токенов
            
        Returns:
            dict: Ответ API или None в случае ошибки
        """
        # Проверяем валидность токена перед запросом
        if not self.ensure_valid_token():
            print("Ошибка аутентификации")
            return None
        
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": "GigaChat:latest",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            response = requests.post(
                url, 
                headers=self.headers, 
                data=json.dumps(payload),
                verify=False
            )
            
            if response.status_code == 200:
                return response.json()
            # Если токен истек или недействителен, пробуем обновить его
            elif response.status_code == 401:
                print("Токен недействителен или истек, обновляем...")
                # Сбрасываем текущий токен и время истечения
                self.access_token = None
                self.token_expires_at = None
                
                if self.authenticate():
                    # Повторяем запрос с новым токеном
                    return self.chat_completion(messages, temperature, max_tokens)
                else:
                    print("Не удалось обновить токен")
                    return None
            else:
                print(f"Ошибка запроса: {response.status_code}")
                print(f"Ответ: {response.text}")
                return None
                
        except Exception as e:
            print(f"Исключение при запросе к API: {str(e)}")
            return None

# Пример использования
if __name__ == "__main__":
    # Отключаем предупреждения о неверных SSL-сертификатах
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    client = GigaChatClient()
    if client.authenticate():
        # Пример 1: Первый запрос
        messages = [
            {"role": "user", "content": "Привет! Расскажи о себе."}
        ]
        
        response = client.chat_completion(messages)
        if response:
            try:
                content = response['choices'][0]['message']['content']
                print(f"\nОтвет от GigaChat:\n{content}")
            except KeyError:
                print(f"Неожиданный формат ответа: {response}")
                
        # Пример 2: Демонстрация работы с истечением токена (для теста)
        print("\nДемонстрация механизма обновления токена...")
        print("Имитация истечения срока действия токена...")
        client.token_expires_at = datetime.now() - timedelta(minutes=1)  # Срок истек
        
        messages = [
            {"role": "user", "content": "Что такое механизм обновления токенов?"}
        ]
        
        response = client.chat_completion(messages)
        if response:
            try:
                content = response['choices'][0]['message']['content']
                print(f"\nОтвет после обновления токена:\n{content}")
            except KeyError:
                print(f"Неожиданный формат ответа: {response}")
    else:
        print("Не удалось аутентифицироваться") 