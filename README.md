# AI Assistant

Веб-приложение с чат-ботом на базе GigaChat и функцией преобразования речи в текст и текста в речь с использованием SaluteSpeech.

## 🚀 Основные возможности

- **Интерактивный чат**: двусторонняя связь по WebSocket — сообщения приходят моментально.
- **Голосовой ввод / вывод**: преобразование речи ↔ текст через SaluteSpeech (STT/TTS).
- **Аутентификация**: регистрация / вход, JWT-токен хранится в `localStorage`.
- **История**: сообщения и чаты хранятся в SQLite, доступны после перезахода.
- **AI-агент**: GigaChat + веб-поиск + парсер новостей (LangChain / LangGraph).

## 🛠️ Стек технологий

- **Бэкенд**: Python, FastAPI, SQLAlchemy, LangChain, Uvicorn
- **Фронтенд**: React, Axios, Styled-components
- **База данных**: SQLite

## Подробности реализации

### Бэкенд (FastAPI)
- CRUD чатов, сообщений, пользователей.  
- WebSocket `/chat/ws/{id}` — обмен сообщениями в реальном времени.  
- `ai_agent_new.py` классифицирует запросы, вызывает:
  * `news_parser_old.get_news_summary` — быстрый HTML-парсер.
  * `new_agent.run_news_agent` — fallback LangGraph-пайплайн.
- Endpoints для голоса: `/voice/stt` и `/voice/tts` (реальный вызов SaluteSpeech API).

### Фронтенд (React)
- SPA на CRA, `styled-components` для темы.  
- `ChatWindow` устанавливает WebSocket и рендерит Markdown-ответы.  
- `VoiceRecorder` использует `MediaRecorder` API, показывает 🎤.

## Установка

### Бэкенд

1. Клонируйте репозиторий:
   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Создайте виртуальное окружение:
   ```
   python -m venv venv
   ```

3. Активируйте виртуальное окружение:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```
     source venv/bin/activate
     ```

4. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```

### Фронтенд

1. Перейдите в директорию клиента:
   ```
   cd client
   ```

2. Установите зависимости:
   ```
   npm install
   ```

## Запуск приложения

### Бэкенд

Запустите сервер с помощью:

```
python main.py
```

Или напрямую через uvicorn:

```
uvicorn main:app --reload --port 8080
```

API будет доступно по адресу `http://localhost:8080`.

### Фронтенд

Запустите React приложение:

```
cd client
npm start
```

Фронтенд будет доступен по адресу `http://localhost:3000`.

## Документация API

После запуска сервера, вы можете получить доступ к интерактивной документации API:

- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## Структура проекта

```
ai-assistant/
├── app/                      # Бэкенд-код FastAPI
│   ├── database/             # Настройки базы данных
│   ├── models/               # SQLAlchemy модели
│   ├── routers/              # API маршруты
│   ├── schemas/              # Pydantic схемы
│   └── utils/                # Утилиты (auth, AI agent)
├── client/                   # Фронтенд-код React
│   ├── public/               # Публичные файлы
│   └── src/                  # Исходный код React
│       ├── api/              # API клиенты
│       ├── components/       # React компоненты
│       ├── context/          # Контексты (Auth)
│       └── pages/            # Страницы приложения
├── venv/                     # Виртуальное окружение Python
├── .env                      # Переменные окружения
├── .gitignore                # Исключения для Git
├── app.db                    # SQLite база данных
├── main.py                   # Главный файл FastAPI
└── requirements.txt          # Python зависимости
```

## API эндпойнты

### Аутентификация

- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/token` - Вход и получение токена доступа

### Чат

- `POST /chat/` - Создание нового чата
- `GET /chat/` - Получение всех чатов текущего пользователя
- `GET /chat/{chat_id}` - Получение конкретного чата
- `POST /chat/{chat_id}/messages` - Отправка сообщения в чат
- `GET /chat/{chat_id}/messages` - Получение всех сообщений в чате
- `WebSocket /chat/ws/{chat_id}` - WebSocket эндпойнт для общения в реальном времени

### Голосовые команды

- `POST /voice/stt` — WebM → текст (SaluteSpeech STT)
- `POST /voice/tts` — текст → аудио (SaluteSpeech TTS)
