# AI Assistant

Полноценное приложение с чат-ботом, включающее бэкенд на FastAPI и фронтенд на React. Система обеспечивает аутентификацию пользователей, чат с историей сообщений через WebSocket и возможность голосового управления.

## Возможности

### Бэкенд (FastAPI)
- Аутентификация пользователей (регистрация и вход)
- Хранение истории чатов
- Поддержка WebSocket для обмена сообщениями в реальном времени
- Функциональность голосовых команд (моковая реализация)
- LangChain агент с возможностью веб-поиска (моковая реализация)
- База данных SQLite для хранения пользователей и истории чатов

### Фронтенд (React)
- Современный интерфейс с использованием styled-components
- Адаптивный дизайн для десктопов и мобильных устройств
- Страницы для входа и регистрации
- Список чатов с возможностью создания новых
- Чат с поддержкой текстовых и голосовых сообщений
- WebSocket для получения ответов в режиме реального времени

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

- `POST /voice/transcribe` - Преобразование голоса в текст (моковая реализация)
- `POST /voice/synthesize` - Преобразование текста в речь (моковая реализация)

## Использование WebSocket

Для правильного подключения к WebSocket с аутентификацией:

```javascript
const token = localStorage.getItem('token');
const socket = new WebSocket(`ws://localhost:8080/chat/ws/${chatId}?token=${token}`);

// Открытие соединения
socket.onopen = function(e) {
  console.log('Соединение установлено');
  
  // Отправка сообщения
  socket.send(JSON.stringify({
    content: 'Привет, AI Assistant!',
    is_voice: 0
  }));
};

// Получение сообщений
socket.onmessage = function(event) {
  const response = JSON.parse(event.data);
  console.log('Сообщение от сервера:', response);
};
```

## Примечания по безопасности

- Для использования в продакшн замените `SECRET_KEY` в `app/utils/auth.py` на безопасный случайный ключ и храните его в переменных окружения
- Настройте корректные CORS настройки в `main.py` для продакшн
- Используйте HTTPS в продакшн
- Рассмотрите возможность использования более надежной базы данных вместо SQLite для продакшн 