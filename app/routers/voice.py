from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import json
import logging
import os
from datetime import datetime
import subprocess
import tempfile
from pydub import AudioSegment
import sys

from app.database.init_db import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.salutespeech_client import SaluteSpeechClient, SALUTE_SPEECH_VOICES, VOICE_DESCRIPTIONS, DEFAULT_VOICE
# from app.routers.mongo_adapter import get_mongo_collections

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- НАСТРОЙКА FFMPEG ---
# Устанавливаем путь к ffmpeg из переменной окружения
# pydub будет использовать этот путь для поиска ffmpeg.exe и ffprobe.exe
ffmpeg_path = os.getenv("FFMPEG_PATH")
if ffmpeg_path and os.path.exists(ffmpeg_path):
    AudioSegment.converter = ffmpeg_path
    logger.info(f"pydub будет использовать ffmpeg из: {ffmpeg_path}")
else:
    logger.warning("Переменная FFMPEG_PATH не задана или путь не существует. "
                     "pydub будет искать ffmpeg в системном PATH. "
                     "Если конвертация не удастся, укажите путь к ffmpeg.exe в .env файле.")
# --- КОНЕЦ НАСТРОЙКИ ---

router = APIRouter(
    prefix="/voice",
    tags=["voice"],
)

client = SaluteSpeechClient()

@router.post("/transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Преобразование голоса в текст через SaluteSpeech STT
    """
    logger.info(f"Получен запрос на транскрипцию от пользователя: {current_user.username}")
    
    # Получаем базовый тип контента из заголовка файла
    content_type = file.content_type or 'audio/wav'
    logger.info(f"Оригинальный Content-Type файла: {content_type}")
    
    try:
        audio_bytes = await file.read()
        file_size_mb = len(audio_bytes) / (1024 * 1024)
        logger.info(f"Размер аудио: {len(audio_bytes)} байт ({file_size_mb:.2f} МБ)")
        
        # ВРЕМЕННО: Сохраняем файл для отладки
        debug_dir = "debug_audio"
        if not os.path.exists(debug_dir):
            os.makedirs(debug_dir)
        
        # Определяем расширение файла
        ext = '.webm'
        if 'wav' in content_type.lower():
            ext = '.wav'
        elif 'ogg' in content_type.lower():
            ext = '.ogg'
        elif 'mp3' in content_type.lower():
            ext = '.mp3'
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        debug_filename = f"{debug_dir}/audio_{timestamp}{ext}"
        
        with open(debug_filename, 'wb') as f:
            f.write(audio_bytes)
        
        logger.info(f"DEBUG: Аудио файл сохранен как {debug_filename}")
        print(f"[DEBUG] Аудио файл сохранен для отладки: {debug_filename}")
        print(f"[DEBUG] Content-Type: {content_type}")
        print(f"[DEBUG] Размер: {len(audio_bytes)} байт")
        # КОНЕЦ ВРЕМЕННОГО БЛОКА
        
        # Проверка размера файла (SaluteSpeech принимает максимум 2МБ)
        if file_size_mb > 2.0:
            logger.warning(f"Файл слишком большой: {file_size_mb:.2f} МБ. Лимит SaluteSpeech API: 2 МБ")
            raise HTTPException(status_code=413, detail="Файл слишком большой. Максимальный размер: 2 МБ")
        
        # Преобразуем Content-Type в формат, который ожидает SaluteSpeech API
        logger.info(f"Исходный Content-Type: {content_type}")
        
        if 'wav' in content_type.lower():
            # Для WAV файлов должен использоваться audio/x-pcm
            api_content_type = 'audio/x-pcm;bit=16;rate=16000'
            logger.info("WAV формат - используем audio/x-pcm")
        elif 'ogg' in content_type.lower() and 'opus' in content_type.lower():
            # Для настоящих OGG файлов с opus кодеком 
            api_content_type = 'audio/ogg;codecs=opus'
            logger.info("OGG+Opus формат - оставляем как есть")
        elif 'webm' in content_type.lower():
            # WebM не поддерживается API напрямую, конвертируем в WAV
            api_content_type = 'audio/x-pcm;bit=16;rate=16000'
            logger.warning("WebM формат будет сконвертирован в WAV")
            
            # Конвертация WebM в WAV через pydub
            try:
                # Создаем временные файлы
                with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_webm:
                    tmp_webm.write(audio_bytes)
                    tmp_webm_path = tmp_webm.name
                
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_wav:
                    tmp_wav_path = tmp_wav.name
                
                # Загружаем WebM и конвертируем в WAV
                logger.info("Начинаем конвертацию WebM в WAV...")
                audio = AudioSegment.from_file(tmp_webm_path, format="webm")
                
                # Устанавливаем параметры для SaluteSpeech
                audio = audio.set_frame_rate(16000)  # 16 кГц
                audio = audio.set_channels(2)        # Стерео (API требует)
                audio = audio.set_sample_width(2)    # 16 bit
                
                # Экспортируем в WAV
                audio.export(tmp_wav_path, format="wav")
                
                # Читаем WAV файл
                with open(tmp_wav_path, 'rb') as f:
                    audio_bytes = f.read()
                    
                logger.info(f"WebM успешно сконвертирован в WAV, новый размер: {len(audio_bytes)} байт")
                
                # Удаляем временные файлы
                os.unlink(tmp_webm_path)
                os.unlink(tmp_wav_path)
                
            except FileNotFoundError:
                logger.error("ffmpeg не найден. Убедитесь, что он установлен и путь к нему (FFMPEG_PATH) указан в .env файле.")
                raise HTTPException(
                    status_code=500, 
                    detail="Сервер не может конвертировать аудио. Установите ffmpeg и укажите путь в .env файле."
                )
            except Exception as e:
                logger.error(f"Ошибка при конвертации WebM в WAV: {e}", exc_info=True)
                # Если конвертация не удалась, пробуем как OGG (вероятно не сработает)
                api_content_type = 'audio/ogg;codecs=opus'
                logger.warning("Конвертация не удалась, отправляем как OGG")
        else:
            # Для остальных форматов пробуем как есть
            api_content_type = content_type
            logger.warning(f"Неизвестный формат {content_type}, пробуем как есть")
        
        logger.info(f"Финальный API Content-Type: {api_content_type}")
        
        # Вызов SaluteSpeech для транскрипции
        transcription = client.transcribe(audio_bytes, api_content_type)
        
        # Проверка на None - означает ошибку соединения или проблему с API
        if transcription is None:
            logger.error("Ошибка соединения с SaluteSpeech API. Возможно, сервис недоступен.")
            raise HTTPException(
                status_code=503,
                detail="Сервис распознавания речи временно недоступен. Пожалуйста, попробуйте позже."
            )
        
        # Пустая строка означает, что запрос прошел, но распознавания не произошло
        if not transcription:
            # Если пустой результат, попробуем еще раз с дополнительной диагностикой
            logger.warning("Получен пустой результат от API. Возможные причины:")
            logger.warning("1. Слишком тихая запись - говорите громче")
            logger.warning("2. Слишком короткая запись - говорите дольше") 
            logger.warning("3. Плохое качество микрофона")
            logger.warning("4. Фоновый шум")
            
            # Возвращаем информативное сообщение пользователю
            return {
                "text": "",
                "warning": "Речь не распознана. Попробуйте говорить громче и четче.",
                "debug": {
                    "file_size": len(audio_bytes),
                    "content_type": content_type,
                    "api_content_type": api_content_type
                }
            }
        
        logger.info(f"Успешная транскрипция: '{transcription[:30]}...'")
        return {"text": transcription}
    except HTTPException as he:
        # Пробрасываем уже созданные HTTP исключения
        raise he
    except Exception as e:
        logger.exception(f"Ошибка при обработке транскрипции: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке аудио: {str(e)}")

@router.post("/synthesize")
async def synthesize_speech(
    request: Request,
    data: dict,
    current_user = Depends(get_current_user)
):
    """
    Преобразование текста в речь через SaluteSpeech TTS

    Доступные голоса:
    - May_24000, May_8000 - Женский голос (Майя)
    - Bys_24000, Bys_8000 - Мужской голос (Борис)
    - Tur_24000, Tur_8000 - Мужской голос (Тур)
    - Nec_24000, Nec_8000 - Женский голос (Нэц)
    - Ost_24000, Ost_8000 - Мужской голос (Ост)
    - Pon_24000, Pon_8000 - Женский голос (Понь)
    - Kin_24000, Kin_8000 - Мужской голос (Кин)
    - Kma_24000, Kma_8000 - Женский голос (Кма)
    - Rma_24000, Rma_8000 - Мужской голос (Рма)
    
    Голоса с постфиксом _24000 имеют более высокое качество.
    """
    # Выводим полные данные запроса для отладки
    print(f"[DEBUG] Синтез речи, полученные данные: {data}", file=sys.stderr)
    logger.info(f"Получен запрос на синтез речи от пользователя: {current_user.username}")
    
    text = data.get("text", "")
    voice = data.get("voice", DEFAULT_VOICE)  # Голос по умолчанию из настроек
    enable_tts = data.get("enable_tts", True)  # По умолчанию синтез включен
    
    print(f"[DEBUG] Параметры синтеза: text={text[:30]}..., voice={voice}, enable_tts={enable_tts}", file=sys.stderr)
    
    if not text:
        logger.warning("Запрос синтеза без текста")
        raise HTTPException(status_code=400, detail="Text is required")
    
    # Если синтез отключен, возвращаем пустую ссылку
    if enable_tts is False:
        logger.info("Синтез речи отключен пользователем, пропускаем")
        return {"audio_url": "", "message": "Text-to-speech is disabled"}
    
    # Проверяем, что голос допустимый
    if voice not in SALUTE_SPEECH_VOICES:
        logger.warning(f"Запрошен недопустимый голос: {voice}. Будет использован голос по умолчанию: {DEFAULT_VOICE}")
        voice = DEFAULT_VOICE
    
    logger.info(f"Запрос на синтез: '{text[:30]}...', голос: {voice}")
    
    try:
        # Используем улучшенный метод synthesize с выбором голоса
        audio_base64 = client.synthesize(text, voice=voice)
        
        # Проверка на None - означает ошибку соединения или проблему с API
        if audio_base64 is None:
            logger.error("Ошибка соединения с SaluteSpeech API для синтеза речи.")
            raise HTTPException(
                status_code=503,
                detail="Сервис синтеза речи временно недоступен. Пожалуйста, попробуйте позже."
            )
        
        if not audio_base64:
            logger.error("Ошибка при синтезе речи: пустой результат")
            raise HTTPException(status_code=500, detail="Ошибка при синтезе речи")
        
        # Data URI для ogg/opus формата (по умолчанию в synthesize)
        audio_url = f"data:audio/ogg;base64,{audio_base64}"
        logger.info(f"Успешный синтез речи, размер base64: {len(audio_base64)} символов")
        return {"audio_url": audio_url}
    except HTTPException as he:
        # Пробрасываем наши собственные HTTP исключения
        raise he
    except Exception as e:
        logger.exception(f"Ошибка при синтезе речи: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при синтезе речи: {str(e)}") 