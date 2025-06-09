import os
import uuid
import requests
# import base64 # base64 больше не нужен здесь, если AUTH_KEY уже закодирован
from dotenv import load_dotenv
import urllib3

load_dotenv()

# Отключаем предупреждения о неверных SSL-сертификатах
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def get_salute_access_token():
    """
    Получает access_token от SaluteSpeech API, используя Authorization Key из .env.

    Ожидает переменные окружения:
    - SALUTE_SPEECH_AUTH_TOKEN: Ключ авторизации (предположительно, уже закодированный)
    - SALUTE_SPEECH_AUTH_URL (опционально): URL OAuth сервиса
    - SALUTE_SPEECH_SCOPE (опционально): scope для получения токена
    - SALUTE_SPEECH_RQUID (опционально): идентификатор запроса

    Возвращает dict с 'access_token' и 'expires_in' или None при ошибке
    """
    auth_key = os.getenv("SALUTE_SPEECH_AUTH_TOKEN")

    if not auth_key:
        print("Переменная SALUTE_SPEECH_AUTH_TOKEN не задана в .env")
        return None

    # SALUTE_SPEECH_CLIENT_ID больше не используется напрямую для этого запроса,
    # так как auth_key должен содержать все необходимое для Basic Auth.
    # client_id = os.getenv("SALUTE_SPEECH_CLIENT_ID") 

    rq_uid = os.getenv("SALUTE_SPEECH_RQUID") or str(uuid.uuid4())
    auth_url = os.getenv("SALUTE_SPEECH_AUTH_URL", "https://ngw.devices.sberbank.ru:9443/api/v2/oauth")
    scope = os.getenv("SALUTE_SPEECH_SCOPE", "SALUTE_SPEECH_PERS")

    payload = { 'scope': scope }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rq_uid,
        'Authorization': f'Basic {auth_key}' # Используем auth_key напрямую
    }
    try:
        response = requests.post(auth_url, headers=headers, data=payload, verify=False, timeout=10)
        
        # Проверяем успешный статус код
        response.raise_for_status() # Вызовет HTTPError для плохих статусов (4xx, 5xx)

        token_data = response.json()
        print(f"SaluteSpeech токен успешно получен. Expires in: {token_data.get('expires_in')}")
        return {
            'access_token': token_data.get('access_token'),
            'expires_in': token_data.get('expires_in', 3600)
        }
    
    except requests.exceptions.RequestException as e:
        # Это общий обработчик для всех ошибок requests, включая ConnectionError, Timeout, HTTPError
        error_message = f"Сетевая ошибка при запросе токена SaluteSpeech к {auth_url}: {e}"
        print(error_message)
        
        # Дополнительная диагностика для распространенных проблем
        if isinstance(e, requests.exceptions.ConnectionError):
            print("ОШИБКА ПОДКЛЮЧЕНИЯ: Не удалось установить соединение с сервером. "
                  "Проверьте ваше интернет-соединение, настройки DNS и доступность хоста.")
        elif isinstance(e, requests.exceptions.Timeout):
            print("ОШИБКА ТАЙМ-АУТА: Сервер не ответил вовремя. "
                  "Возможно, сервер перегружен или есть проблемы с сетью.")
        elif isinstance(e, requests.exceptions.HTTPError):
            print(f"HTTP ОШИБКА: Сервер вернул статус {e.response.status_code}. Ответ: {e.response.text}")
            
        return None
    
    except Exception as e:
        print(f"Непредвиденное исключение при запросе SaluteSpeech токена: {e}")
        return None 