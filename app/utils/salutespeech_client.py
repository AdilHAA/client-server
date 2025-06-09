import os
import requests
import base64
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from .salutespeech_auth import get_salute_access_token
import urllib3 # Добавлено для отключения предупреждений

# Отключаем предупреждения о неверных SSL-сертификатах (если это необходимо для локальной разработки)
# На продакшене это не рекомендуется.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Список доступных голосов в SaluteSpeech API
SALUTE_SPEECH_VOICES = [
    "Bys_24000", "Bys_8000", 
    "May_24000", "May_8000", 
    "Tur_24000", "Tur_8000", 
    "Nec_24000", "Nec_8000", 
    "Ost_24000", "Ost_8000", 
    "Pon_24000", "Pon_8000", 
    "Kin_8000", "Kin_24000", 
    "Kma_24000", "Kma_8000", 
    "Rma_24000", "Rma_8000"
]

# Словарь с информацией о голосах (для удобства)
VOICE_DESCRIPTIONS = {
    "Bys": "Мужской голос (Борис)",
    "May": "Женский голос (Майя)",
    "Tur": "Мужской голос (Тур)",
    "Nec": "Женский голос (Нэц)",
    "Ost": "Мужской голос (Ост)",
    "Pon": "Женский голос (Понь)",
    "Kin": "Мужской голос (Кин)",
    "Kma": "Женский голос (Кма)",
    "Rma": "Мужской голос (Рма)"
}

# Голос по умолчанию
DEFAULT_VOICE = "May_24000"  # Женский голос (Майя) с высоким качеством

class SaluteSpeechClient:
    """
    Клиент для работы с SaluteSpeech API: STT (speech-to-text) и TTS (text-to-speech)
    """
    def __init__(self):
        # Базовый URL для SaluteSpeech API v1 (согласно документации)
        self.base_url = "https://smartspeech.sber.ru/rest/v1"
        print(f"[DEBUG] SaluteSpeechClient initialized with base_url: {self.base_url}") # Отладочный вывод
        self.access_token = None
        self.token_expires_at = None
        # Общие заголовки, Authorization добавится после аутентификации
        self.headers = {
            'Accept': 'application/json' 
        }

    def authenticate(self):
        """Получает и сохраняет токен доступа."""
        token_info = get_salute_access_token()
        if not token_info or not token_info.get('access_token'):
            print("Не удалось получить токен доступа SaluteSpeech или токен пуст.")
            self.access_token = None
            self.token_expires_at = None
            return False
        
        self.access_token = token_info['access_token']
        expires_in = token_info.get('expires_in', 3600) # Значение по умолчанию, если не пришло
        # Устанавливаем буферное время, чтобы обновить токен заранее
        buffer_time = min(300, int(expires_in * 0.1)) # 10% от времени жизни или 5 минут
        self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - buffer_time)
        print(f"SaluteSpeech токен получен, действителен до: {self.token_expires_at}")
        return True

    def ensure_valid_token(self):
        """Проверяет валидность токена и обновляет его при необходимости."""
        if not self.access_token or not self.token_expires_at or datetime.now() >= self.token_expires_at:
            print("Токен SaluteSpeech отсутствует или истек, обновляем...")
            if not self.authenticate():
                # Если аутентификация не удалась, возвращаем False
                print("Не удалось обновить токен SaluteSpeech. Запросы к API будут невозможны.")
                return False
        return True

    def transcribe(self, audio_bytes: bytes, content_type: str = 'audio/wav') -> Optional[str]:
        """
        Преобразует аудио в текст через SaluteSpeech STT API v1 (/speech:recognize).

        Args:
            audio_bytes: байты аудио.
            content_type: MIME тип аудио (например, 'audio/ogg;codecs=opus', 'audio/wav').
                        SaluteSpeech поддерживает аудиоданные разных форматов.
        Returns:
            Текстовая транскрипция, пустая строка если транскрипция не удалась, или None при ошибке подключения.
        """
        print(f"[DEBUG] Transcribe вызван с content_type: {content_type}, размер аудио: {len(audio_bytes)} байт")
        
        if not self.ensure_valid_token():
            print("Ошибка аутентификации SaluteSpeech для STT. Проверьте учетные данные и доступность API.")
            # Возвращаем None, чтобы сигнализировать об ошибке аутентификации
            return None
        
        # Формируем URL для синхронного распознавания речи (API v1)
        url = f"{self.base_url}/speech:recognize"
        
        req_uid = str(uuid.uuid4()) # X-Request-ID должен быть UUID v4
        
        # Заголовки для STT согласно документации
        stt_headers = {
            'Authorization': f"Bearer {self.access_token}",
            'Content-Type': content_type,  # Тип аудио, например 'audio/wav', 'audio/mpeg'
            'X-Request-ID': req_uid,
            'Accept': 'application/json'
        }
        
        # Параметры запроса согласно документации
        params = {
            'language': 'ru-RU', # Язык распознавания
            'enable_profanity_filter': 'false', # Отключение фильтра ненормативной лексики
            'model': 'general' # Модель для распознавания
        }
        
        # Добавим параметры в зависимости от формата аудио
        if 'wav' in content_type.lower() or 'pcm' in content_type.lower() or 'l16' in content_type.lower():
            # Для WAV/PCM форматов - извлекаем rate из content_type или используем по умолчанию
            # Пример: 'audio/x-pcm;bit=16;rate=48000' -> rate=48000
            rate = '16000'  # По умолчанию
            if 'rate=' in content_type:
                try:
                    rate_part = content_type.split('rate=')[1].split(';')[0].split(',')[0]
                    rate = rate_part
                    print(f"[DEBUG] Извлечен rate из content_type: {rate}")
                except:
                    rate = '16000'
                    print(f"[DEBUG] Не удалось извлечь rate, используем по умолчанию: {rate}")
            
            params['sample_rate'] = rate
            params['channels_count'] = '2'   # API требует стерео
            print(f"[DEBUG] Для WAV/PCM установлены параметры: sample_rate={rate}, channels_count=2")
        elif 'webm' in content_type.lower():
            # Для WebM с Opus нам не нужно указывать дополнительные параметры,
            # SaluteSpeech должен автоматически определить параметры
            print(f"[DEBUG] WebM формат - дополнительные параметры не нужны")
            pass
        elif 'ogg' in content_type.lower():
            # Для Ogg с Opus кодеком также не требуются дополнительные параметры
            print(f"[DEBUG] OGG формат - дополнительные параметры не нужны")
            pass

        print(f"STT Request URL: {url}")
        print(f"STT Request Params: {params}")
        print(f"STT Request Headers: {json.dumps(stt_headers, default=str)}")
        print(f"STT Audio Content-Type: {content_type}")
        print(f"STT Audio size: {len(audio_bytes)} bytes")
        
        try:
            # Отправляем аудио напрямую в теле запроса, как в примере из документации
            response = requests.post(url, headers=stt_headers, params=params, data=audio_bytes, verify=False)
            print(f"STT Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"STT Raw Response: {json.dumps(result, ensure_ascii=False)}")
                
                # Обработка ответа согласно документации API v1
                # Пример успешного ответа: {"result": ["текст 1", "текст 2"], "status": 200}
                if result and isinstance(result, dict) and 'result' in result and result['result']:
                    # Объединяем все предложения в одну строку
                    transcription = ' '.join(result['result'])
                    print(f"STT Transcription: {transcription}")
                    return transcription
                else:
                    print(f"STT: Не удалось извлечь транскрипцию из ответа. Ответ: {result}")
                    # Возвращаем пустую строку, если ответ успешен, но не содержит текста
                    return ""
            else:
                print(f"Ошибка STT SaluteSpeech: {response.status_code}")
                error_text = response.text
                print(f"STT Error Response Text: {error_text}")
                try:
                    error_details = response.json()
                    print(f"STT Error Details (JSON): {json.dumps(error_details, ensure_ascii=False)}")
                except json.JSONDecodeError:
                    print("STT Error response is not valid JSON.")
                # Возвращаем None, чтобы обозначить ошибку запроса к API
                return None
        except requests.exceptions.RequestException as e:
            print(f"Исключение при запросе STT SaluteSpeech (requests.exceptions.RequestException): {e}")
            return None
        except Exception as e:
            print(f"Общее исключение при STT SaluteSpeech: {e}")
            return None

    def synthesize(self, text: str, voice: str = DEFAULT_VOICE, audio_format: str = "opus") -> Optional[str]:
        """
        Преобразует текст в аудио через SaluteSpeech TTS API.

        Args:
            text: входной текст для синтеза.
            voice: имя голоса из списка SALUTE_SPEECH_VOICES
                  (например, "May_24000", "Bys_24000").
            audio_format: формат выходного аудио ("opus", "pcm", "alaw", "mulaw"). По умолчанию "opus".
                          "opus" возвращается в контейнере ogg.
                          "pcm" это PCM S16LE.
        Returns:
            Base64 аудио-контента (в формате ogg/opus или pcm) или None при ошибке.
        """
        if not self.ensure_valid_token():
            print("Ошибка аутентификации SaluteSpeech для TTS. Проверьте учетные данные и доступность API.")
            return None
        
        # Проверяем, что запрошенный голос поддерживается API
        if voice not in SALUTE_SPEECH_VOICES:
            print(f"Предупреждение: голос '{voice}' не поддерживается SaluteSpeech API. Используем голос по умолчанию '{DEFAULT_VOICE}'")
            voice = DEFAULT_VOICE
        
        # TTS URL для API v1
        url = f"{self.base_url}/text:synthesize"
        req_uid = str(uuid.uuid4()) # X-Request-ID должен быть UUID v4
        
        tts_headers = {
            'Authorization': f"Bearer {self.access_token}",
            'Content-Type': 'application/text', # Исправлено с 'application/json' на 'application/text'
            'X-Request-ID': req_uid,
            'Accept': 'audio/ogg;codecs=opus' # По умолчанию ожидаем ogg/opus
        }

        # Формируем тело запроса для TTS API v1
        # ВАЖНО: Текст отправляется напрямую, не в формате JSON
        payload = text

        # Параметры запроса - перемещаем настройки из тела в URL параметры
        params = {
            "voice": voice,  # Например, "May_24000"
            "audio_encoding": audio_format.upper()  # "OPUS", "PCM" и т.д.
        }
        
        # Для PCM может потребоваться sample_rate
        if audio_format.upper() == "PCM":
            params["sample_rate_hertz"] = "22050"  # Добавляем частоту дискретизации как параметр

        print(f"TTS Request URL: {url}")
        print(f"TTS Request Headers: {json.dumps(tts_headers, default=str)}")
        print(f"TTS Request Params: {params}")
        print(f"TTS Request Text: {text[:50]}..." if len(text) > 50 else text)

        try:
            # Отправляем текст напрямую, без обертки в JSON
            response = requests.post(
                url, 
                headers=tts_headers, 
                params=params,
                data=text,  # Текст отправляется как есть
                verify=False
            )
            print(f"TTS Response status: {response.status_code}")

            if response.status_code == 200:
                # API для синтеза возвращает аудиопоток напрямую
                # Content-Type ответа будет указывать на формат
                response_content_type = response.headers.get('Content-Type', '')
                print(f"TTS Response Content-Type: {response_content_type}")
                
                audio_bytes = response.content
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                print(f"TTS Audio synthesized, {len(audio_bytes)} bytes, base64 length: {len(audio_base64)}")
                return audio_base64
            else:
                print(f"Ошибка TTS SaluteSpeech: {response.status_code}")
                error_text = response.text
                print(f"TTS Error Response Text: {error_text}")
                try:
                    error_details = response.json()
                    print(f"TTS Error Details (JSON): {json.dumps(error_details, ensure_ascii=False)}")
                except json.JSONDecodeError:
                    print("TTS Error response is not valid JSON.")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Исключение при запросе TTS SaluteSpeech (requests.exceptions.RequestException): {e}")
            return None
        except Exception as e:
            print(f"Общее исключение при TTS SaluteSpeech: {e}")
            return None 