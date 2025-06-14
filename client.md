# Папка `client/` – архитектура фронтенда

Документ описывает структуру, библиотеки и ключевые алгоритмы клиентской части AI Assistant, созданной на **React** (Create-React-App).

```
client/
 ├── public/              # Статические файлы, index.html, иконки
 ├── src/
 │    ├── api/            # Обёртки Axios для REST/WS
 │    ├── assets/         # Изображения, svg, иконки
 │    ├── components/     # Переиспользуемые UI-блоки
 │    ├── context/        # React Context (Auth)
 │    ├── pages/          # Страницы -> роуты React-Router
 │    ├── styles/         # Глобальные стили / переменные CSS
 │    ├── utils/          # Вспомогатель ные функции (дата-формат, debouncing …)
 │    ├── App.js          # Корневой компонент и маршрутизация
 │    └── index.js        # Точка входа / ReactDOM.createRoot
 ├── package.json         # JS-зависимости и NPM-скрипты
 └── ...
```

---
## 1. Стек библиотек

| Область | Библиотека | Назначение |
|---------|------------|------------|
| UI      | **React 18** | Компонентный подход |
| Routing | **react-router-dom** | Маршруты `/login`, `/register`, `/chats` |
| HTTP    | **axios** | REST-запросы + интерцептор JWT |
| State   | **React Context** | Глобальное хранилище пользователя │
| Styling | **styled-components** | CSS-in-JS, переменные темы |
| Icons   | **react-icons** | SVG-иконки (Feather) |
| Markdown| **react-markdown** | Рендер ответов ассистента |
| Toast   | **react-toastify** | Уведомления |

---
## 2. Подпапки

### 2.1. `api/`
* **`axiosInstance.js`** (встроен в `chatApi.js`)
  * Настраивает `baseURL=/api` (proxy CRA) + интерцептор, который вставляет `Authorization: Bearer <token>`.
* **`authApi.js`**
  * `login(username, pwd)`  → `POST /auth/token`.
  * `register()`            → `POST /auth/register`.
* **`chatApi.js`**
  * CRUD-функции чатов / сообщений (`getAllChats`, `getChatMessages`, `sendMessage`).
  * `connectWebSocket(chatId, onMessage)`
    * Формирует `ws://localhost:8080/chat/ws/{chat}?token=…`.
    * Внутри возвращает объект с методами `.send(content, isVoice)` и `.close()`.
* **`voiceApi.js`** (часть `chatApi`) — `transcribeAudio(blob)` / `synthesizeSpeech(text)` для STT/TTS.

### 2.2. `context/`
* **`AuthContext.js`**
  * Хранит `user`, `accessToken`, `loading`.
  * Методы: `login()`, `logout()`, `register()`.
  * Сохраняет токен в `localStorage` ⇒ после F5 остаётся авторизация.

### 2.3. `components/`
* **`Navbar`** — фикс-топ, показывает имя пользователя, ссылки.
* **`ChatList`** — боковая панель (лево) со всеми чатами.
  * При клике вызывает `onChatSelect(id)`.
* **`ChatWindow`** — правая часть (диалог).
  * Хранит локальный стейт сообщений.
  * Устанавливает WebSocket через `connectWebSocket()`.
  * `handleWebSocketMessage` добавляет ответы ассистента.
  * `handleSendMessage` — оптимистичное добавление + ws / fallback REST.
  * `handleVoiceMessage` — запись голоса (см. ниже) → отправка текста (is_voice=1).
  * Кнопка переключения TTS: `localStorage.textToSpeechEnabled = true|false`.
* **`VoiceRecorder`** — компонент-кнопка 🎤.
  * Использует `MediaRecorder` API для захвата `audio/webm`.
  * Отправляет Blob → `transcribeAudio(blob)` → возвращает текст.

### 2.4. `pages/`
* **`LoginPage`**, **`RegisterPage`** — формы.
* **`ChatsPage`** — композиция `ChatList` + `ChatWindow`.
  * Пустой `selectedChatId` ⇒ показывает **EmptyState** (центрируется flex-box).

### 2.5. `styles/`
* `globalStyles.js` — CSS-переменные (`--primary-color`, `--border-color`).  
  Импортируется в `index.js` через `createGlobalStyle`.

### 2.6. `assets/`
* PNG / SVG иконки (логотип бота).

---
## 3. Ключевые пользовательские сценарии

### 3.1. Поток «Авторизация»
```
LoginPage → authApi.login → POST /auth/token
           ← access_token → AuthContext.setUser
           → navigate /chats
```

### 3.2. Поток «Отправка текстового сообщения»
```
User types → ChatWindow.handleSendMessage
   ↓ (optimistic UI)
WebSocket .send()                 (если online)
  server → WS broadcast → handleWebSocketMessage → adds assistant reply
fallback: POST /chat/{id}/messages → polling back into list
```

### 3.3. Поток «Голосовой ввод»
```
VoiceRecorder.start → MediaRecorder collects chunks → stop
Blob → transcribeAudio(blob) → POST /voice/stt → {text}
ChatWindow.handleVoiceMessage(text, is_voice=1)
  ↳ сообщение одразу появляется (optimistic)
```

### 3.4. Поток «Озвучка ответа»
```
ChatWindow.handleWebSocketMessage → если textToSpeechEnabled
  POST /voice/tts {text}
  ↑ receive audio_url → new Audio(url).play()
```

---
## 4. Работа с WebSocket
* Подключение: протокол (ws/wss) выбирается по `window.location.protocol`.
* Аутентификация: JWT передаётся как query-param `?token=`.
* Формат исх. сообщения `{content, is_voice, timestamp}`.
* Сервер отвечает JSON `id, role, content, is_voice, created_at`.

---
## 5. Глобальное состояние и хранение настроек
* **AuthContext** в `localStorage` держит `accessToken`.
* Настройка TTS (`textToSpeechEnabled`) также persist-ится в `localStorage`.
* Тема (цвета) через CSS-переменные ⇒ легко переопределить dark-mode.

---
## 6. Сборка и деплой
* `npm start` – dev-сервер CRA, proxy на `localhost:8080` (package.json ` 