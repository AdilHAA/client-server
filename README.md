# AI Assistant API

Backend service built with FastAPI featuring user authentication, chat functionality with WebSocket support, and a LangChain-based agent for answering questions with the latest information from the web.

## Features

- User authentication (registration and login)
- Chat history storage
- WebSocket support for real-time chat
- Mock voice command functionality (ready for integration with actual speech services)
- LangChain agent with web search capabilities (mock implementation)
- Database storage for users and chat history

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

Start the application with:

```
python main.py
```

Or using uvicorn directly:

```
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Documentation

After starting the server, you can access the interactive API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/token` - Login and get access token

### Chat

- `POST /chat/` - Create a new chat
- `GET /chat/` - Get all chats for current user
- `GET /chat/{chat_id}` - Get a specific chat
- `POST /chat/{chat_id}/messages` - Send a message in a chat
- `GET /chat/{chat_id}/messages` - Get all messages in a chat
- `WebSocket /chat/ws/{chat_id}` - WebSocket endpoint for real-time chat

### Voice

- `POST /voice/transcribe` - Transcribe voice to text (mock)
- `POST /voice/synthesize` - Convert text to speech (mock)

## WebSocket Usage

Connect to the WebSocket endpoint with:

```javascript
const socket = new WebSocket('ws://localhost:8000/chat/ws/{chat_id}');

// Add authorization header
socket.onopen = function(e) {
  console.log('Connection established');
  
  // Send a message
  socket.send(JSON.stringify({
    content: 'Hello, AI Assistant!',
    is_voice: 0
  }));
};

// Receive messages
socket.onmessage = function(event) {
  const response = JSON.parse(event.data);
  console.log('Message from server:', response);
};
```

## Security Notes

- For production use, replace the `SECRET_KEY` in `app/utils/auth.py` with a secure random key and store it in environment variables
- Configure proper CORS settings in `main.py` for production
- Use HTTPS in production 