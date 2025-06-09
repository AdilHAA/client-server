# AI Assistant

Веб-приложение с чат-ботом на базе GigaChat и функцией преобразования речи в текст и текста в речь с использованием SaluteSpeech.

## Требования

- Docker
- Docker Compose
- Токены доступа к GigaChat и SaluteSpeech API

## Подготовка к деплою

1. Создайте файл `.env` в корневой директории проекта на основе `example_dotenv`:

```bash
cp example_dotenv .env
```

2. Заполните в файле `.env` необходимые токены:
   - `GIGACHAT_AUTH_TOKEN` - токен для доступа к GigaChat API
   - `GIGACHAT_CLIENT_SECRET` - секретный ключ GigaChat
   - `SALUTE_SPEECH_AUTH_TOKEN` - токен для доступа к SaluteSpeech API
   - `SALUTE_SPEECH_SCOPE` - область действия для SaluteSpeech API

## Запуск на локальном компьютере

```bash
docker-compose up --build
```

После запуска приложение будет доступно:
- Фронтенд: http://localhost
- Бэкенд API: http://localhost:8080

## Деплой на сервер

### Вариант 1: Деплой через Docker Compose (рекомендуется)

1. Установите Docker и Docker Compose на вашем сервере:

```bash
# Для Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable --now docker
```

2. Клонируйте репозиторий на сервер:

```bash
git clone <url-вашего-репозитория>
cd <имя-директории>
```

3. Создайте и настройте файл `.env` как описано выше.

4. Запустите приложение:

```bash
docker-compose up -d --build
```

### Вариант 2: Деплой с помощью Nginx и systemd

1. Установите необходимые пакеты:

```bash
sudo apt update
sudo apt install python3 python3-pip nodejs npm nginx ffmpeg
```

2. Настройте серверную часть:

```bash
# Клонируйте репозиторий
git clone <url-вашего-репозитория>
cd <имя-директории>

# Создайте виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt

# Настройте файл .env
cp example_dotenv .env
# Отредактируйте .env с вашими API ключами
```

3. Настройте клиентскую часть:

```bash
cd client
npm install
npm run build
```

4. Создайте systemd сервис для API:

```bash
sudo nano /etc/systemd/system/ai-assistant-api.service
```

Содержимое файла:
```
[Unit]
Description=AI Assistant API
After=network.target

[Service]
User=<имя-пользователя>
WorkingDirectory=/путь/к/вашему/проекту
ExecStart=/путь/к/вашему/проекту/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

5. Настройте Nginx:

```bash
sudo nano /etc/nginx/sites-available/ai-assistant
```

Содержимое файла:
```
server {
    listen 80;
    server_name ваш-домен.ру;

    # Фронтенд
    location / {
        root /путь/к/вашему/проекту/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Бэкенд API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. Активируйте конфигурацию Nginx и запустите сервисы:

```bash
sudo ln -s /etc/nginx/sites-available/ai-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable --now ai-assistant-api
```

## Обновление приложения

### Для Docker Compose:

```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Для ручного деплоя:

```bash
git pull
# Обновите бэкенд
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ai-assistant-api

# Обновите фронтенд
cd client
npm install
npm run build
```

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