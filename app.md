# Папка `app/` – архитектура и логика работы

Документ описывает глубоко внутреннее устройство серверной части проекта AI Assistant. Здесь разобраны назначение каждой подпапки, используемые библиотеки, публичные API-эндпоинты и последовательность обработки ключевых запросов.

---
## 1. Общее

`app/` — корень бэкенда на FastAPI. Структурировано по слоям (Transport → Business → Data):

```
app/
 ├── routers/      # Transport layer – HTTP / WS контроллеры
 ├── utils/        # Business-логика, AI-агенты, JWT, прочие сервисы
 ├── models/       # Data-layer: SQLAlchemy ORM-модели
 ├── schemas/      # Pydantic-схемы (DTO / validation)
 ├── database/     # Инициализация и сессии БД
 └── main.py       # Точка входа FastAPI
```

---
## 2. Файлы и подпапки

### 2.1. `main.py`
* Загружает `.env` (python-dotenv).
* Создаёт `FastAPI()` объект, вешает `CORSMiddleware` (для фронта).
* Подключает роутеры `auth`, `chat`, `voice`.
* Хук `startup` вызывает `create_tables()` ⇒ гарантирует, что SQLite-таблицы существуют.
* При запуске напрямую стартует `uvicorn` на `0.0.0.0:8080`.

### 2.2. `routers/` — транспортный слой

| Файл | Эндпоинты | Краткая логика |
|------|-----------|----------------|
| **`auth.py`** | `POST /auth/register`, `POST /auth/token` | регистрация, вход, генерация JWT (bcrypt хеш паролей) |
| **`chat.py`** | REST CRUD чатов + `WS /chat/ws/{chat_id}` | хранение истории, двусторонний WebSocket с AI-агентом |
| **`voice.py`** | `POST /voice/stt`, `POST /voice/tts` | конвертация WebM → WAV (`ffmpeg`); вызов SaluteSpeech STT/TTS |

*`ConnectionManager`* в `chat.py` ведёт активные WS-сессии.

### 2.3. `models/` — ORM-слой (SQLAlchemy 2.0)
* `user.py` → таблица **`users`**.
* `chat.py` → таблицы **`chats`** и **`messages`** (отношение One-to-Many).
* Авто-поля `created_at`, `updated_at` через `func.now()`.

### 2.4. `schemas/` (Pydantic v2)
* Классы `User`, `Chat`, `Message` и их варианты `Create`.  
  Используются в `response_model` для валидации + автогенерации Swagger.

### 2.5. `database/`
* `init_db.py` — создаёт `engine`, `SessionLocal`, `Base.metadata.create_all()`.
* `get_db()` — зависимость FastAPI для session scope.

### 2.6. `utils/` — бизнес-логика
* **`auth.py`** — JWT (python-jose), `get_current_user` guard.
* **`ai_agent_new.py`** — головной интеллект.
  * `_is_news_query()` — LLM-классификатор (GigaChat) news/chat.
  * `_needs_web_search()` — эвристика + LLM для инфо-вопросов.
  * `_rewrite_query()` — переформулировка запроса под поиск.
  * `_answer_with_web_search()` — DuckDuckGo/Tavily → контекст → LLM-ответ с цитированием.
  * `process_message()` — оркестратор: выбирает путь (news-agent / LLM / web-поиск).
* **`news_parser_old.py`** + `new_agent/` — расширенный новостной агент (LangChain Tools, Tavily, BeautifulSoup).

---
## 3. Сторонние библиотеки
* **FastAPI**, **Uvicorn** – ASGI-стек.
* **SQLAlchemy 2.0**, **SQLite** – хранение данных.
* **Pydantic v2** – валидация DTO.
* **python-jose**, **passlib[bcrypt]** – JWT + хеширование.
* **LangChain**, **langchain-community**, **langchain-gigachat** – работа с LLM.
* **websockets** – WS-поддержка.
* **python-dotenv**, **ffmpeg**, **requests**, **BeautifulSoup4**.

---
## 4. Последовательности запросов

### 4.1. Текстовое сообщение в чат (WS)
1. Клиент отправляет JSON `{content, is_voice}`    → `WS /chat/ws/{id}?token=`.
2. `chat.py` валидирует JWT, пишет `Message(role='user')` в БД.
3. Вызывает `process_message()`.
4. AI-агент генерирует ответ (см. §2.6).
5. Роутер сохраняет `Message(role='assistant')`, отсылает назад по WS.

### 4.2. `POST /voice/stt`
1. Принимается WebM-файл.
2. `ffmpeg` конвертирует → WAV.
3. WAV → SaluteSpeech STT → вернётся `{text}`.

### 4.3. `POST /voice/tts`
1. Получает `{text}`.
2. SaluteSpeech TTS → URL/байты аудио.

---
## 5. Публичные эндпоинты

```
# AUTH
POST /auth/register
POST /auth/token

# CHAT (требует JWT)
GET  /chat/
POST /chat/
GET  /chat/{id}
POST /chat/{id}/messages
GET  /chat/{id}/messages
WS   /chat/ws/{id}?token=...

# VOICE (JWT)
POST /voice/stt
POST /voice/tts

# STATUS
GET /status
```

---
## 6. Итоговая архитектурная диаграмма (слои)

```
[Transport]  routers/*.py           ← FastAPI (HTTP/WS)
[Business ]  utils/ai_agent_new.py  ← LLM + инструменты
[Data     ]  models/, database/     ← SQLAlchemy ORM + SQLite
```

Такое разделение обеспечивает тестируемость, масштабируемость и прозрачную поддержку WebSocket-сессий наряду с REST-API. 