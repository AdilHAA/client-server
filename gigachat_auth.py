import os
import uuid
import requests
import json
from dotenv import load_dotenv

# Загрузка переменных из .env файла
load_dotenv()

def get_access_token():
    """
    Получает access_token от API GigaChat, используя учетные данные из .env файла
    
    Returns:
        str или dict: Токен доступа в формате JWT или словарь с токеном и временем истечения, 
                      None в случае ошибки
    """
    # Получаем учетные данные из .env
    auth_token = os.getenv("GIGACHAT_AUTH_TOKEN")
    
    # Если в .env не найдены необходимые данные
    if not auth_token:
        print("ОШИБКА: GIGACHAT_AUTH_TOKEN не найден в файле .env")
        return None
    
    # Генерируем уникальный идентификатор запроса
    rq_uid = os.getenv("RqUID", str(uuid.uuid4()))
    
    url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    
    payload = {
        'scope': 'GIGACHAT_API_PERS'
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rq_uid,
        'Authorization': f'Basic {auth_token}'
    }
    
    try:
        response = requests.post(url, headers=headers, data=payload, verify=False)
        
        # Проверяем успешность запроса
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            expires_in = token_data.get('expires_in', 1800)  # По умолчанию 30 минут (1800 секунд)
            
            print(f"Токен получен успешно. Срок действия: {expires_in} секунд")
            
            # Возвращаем полную информацию о токене
            return {
                'access_token': access_token,
                'expires_in': expires_in
            }
        else:
            print(f"Ошибка получения токена. Код: {response.status_code}")
            print(f"Ответ: {response.text}")
            return None
    except Exception as e:
        print(f"Исключение при запросе токена: {str(e)}")
        return None

if __name__ == "__main__":
    # Отключаем предупреждения о неверных SSL-сертификатах
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    token_info = get_access_token()
    if token_info:
        print(f"Токен: {token_info['access_token'][:20]}...")
        print(f"Истекает через: {token_info['expires_in']} секунд")
    else:
        print("Не удалось получить токен") 