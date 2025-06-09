from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import List, Dict
import json
import sys

from app.database.init_db import get_db
from app.models.user import User
from app.models.chat import Chat, Message
from app.schemas.chat import ChatCreate, Chat as ChatSchema, ChatResponse, ChatListResponse, MessageCreate, Message as MessageSchema
from app.utils.auth import get_current_user, decode_token
from app.utils.ai_agent_new import process_message

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)

# Store active websocket connections
active_connections: Dict[int, List[WebSocket]] = {}

async def get_chat_or_404(chat_id: int, user_id: int, db: Session):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.post("/", response_model=ChatSchema)
async def create_chat(
    chat: ChatCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_chat = Chat(
        user_id=current_user.id,
        title=chat.title
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

@router.get("/", response_model=ChatListResponse)
async def get_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).all()
    
    # Format the response with last message
    chat_responses = []
    for chat in chats:
        last_message = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at.desc()).first()
        last_message_content = last_message.content if last_message else None
        
        chat_responses.append(ChatResponse(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            last_message=last_message_content
        ))
    
    return ChatListResponse(chats=chat_responses)

@router.get("/{chat_id}", response_model=ChatSchema)
async def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = await get_chat_or_404(chat_id, current_user.id, db)
    return chat

@router.post("/{chat_id}/messages", response_model=MessageSchema)
async def create_message(
    chat_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = await get_chat_or_404(chat_id, current_user.id, db)
    
    # Create user message
    db_message = Message(
        chat_id=chat.id,
        role="user",
        content=message.content,
        is_voice=message.is_voice
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Generate AI response
    ai_response = await process_message(chat_id, message.content)
    
    # Save AI response
    ai_message = Message(
        chat_id=chat.id,
        role="assistant",
        content=ai_response,
        is_voice=0
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)
    
    # Notify websocket connections about new messages
    if chat.id in active_connections:
        for connection in active_connections[chat.id]:
            try:
                await connection.send_text(json.dumps({
                    "user_message": db_message.dict(),
                    "ai_message": ai_message.dict()
                }))
            except:
                pass
    
    return db_message

@router.get("/{chat_id}/messages", response_model=List[MessageSchema])
async def get_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = await get_chat_or_404(chat_id, current_user.id, db)
    messages = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at).all()
    
    # Отладочный вывод
    print(f"Retrieved {len(messages)} messages for chat {chat_id}")
    
    # Явное преобразование SQLAlchemy моделей в словари для корректной сериализации
    result = []
    for msg in messages:
        result.append({
            "id": msg.id,
            "chat_id": msg.chat_id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "is_voice": msg.is_voice
        })
    
    print(f"Serialized {len(result)} messages")
    
    return result

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_id: int,
    db: Session = Depends(get_db)
):
    print(f"[WebSocket] Connection attempt for chat {chat_id}", file=sys.stderr)
    print(f"[WebSocket] URL: {websocket.url}", file=sys.stderr)
    print(f"[WebSocket] Headers: {dict(websocket.headers)}", file=sys.stderr)
    print(f"[WebSocket] Query params: {dict(websocket.query_params)}", file=sys.stderr)
    
    try:
        await websocket.accept()
        print(f"[WebSocket] Connection accepted for chat {chat_id}", file=sys.stderr)
        
        # Валидация аутентификации
        try:
            # В WebSocket нет normal headers, получаем из query параметров
            token = websocket.query_params.get("token")
            print(f"[WebSocket] Token from query params: {token[:10] if token else None}...", file=sys.stderr)
            
            if not token:
                auth_header = websocket.headers.get("Authorization")
                print(f"[WebSocket] Authorization header: {auth_header}", file=sys.stderr)
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    print(f"[WebSocket] Token from Authorization header: {token[:10] if token else None}...", file=sys.stderr)
            
            if not token:
                print(f"[WebSocket] Closed: No authentication token provided", file=sys.stderr)
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
                
            # Проверка токена
            payload = decode_token(token)
            if not payload:
                print(f"[WebSocket] Invalid token, closing connection", file=sys.stderr)
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            
            username = payload.get("username")
            print(f"[WebSocket] Authenticated user: {username}", file=sys.stderr)
            
            # Добавляем соединение к активным
            if chat_id not in active_connections:
                active_connections[chat_id] = []
            active_connections[chat_id].append(websocket)
            print(f"[WebSocket] Connection added for chat {chat_id}, total connections: {len(active_connections[chat_id])}", file=sys.stderr)
            
            try:
                while True:
                    try:
                        data = await websocket.receive_text()
                        print(f"[WebSocket] Received data: {data[:100]}...", file=sys.stderr)
                        message_data = json.loads(data)
                        
                        # Проверяем тип сообщения, пропускаем служебные сообщения
                        if message_data.get("type") == "ping" or not message_data.get("content"):
                            print(f"[WebSocket] Skipping service message type: {message_data.get('type', 'unknown')}", file=sys.stderr)
                            continue
                        
                        # Создаем сообщение пользователя в БД
                        db_message = Message(
                            chat_id=chat_id,
                            role="user",
                            content=message_data.get("content", ""),
                            is_voice=message_data.get("is_voice", 0)
                        )
                        db.add(db_message)
                        db.commit()
                        db.refresh(db_message)
                        print(f"[WebSocket] User message saved to DB: {db_message.id}", file=sys.stderr)
                        
                        # Обрабатываем с помощью AI
                        ai_response = await process_message(chat_id, message_data.get("content", ""))
                        
                        # Сохраняем ответ AI
                        ai_message = Message(
                            chat_id=chat_id,
                            role="assistant",
                            content=ai_response,
                            is_voice=0
                        )
                        db.add(ai_message)
                        db.commit()
                        db.refresh(ai_message)
                        print(f"[WebSocket] AI message saved to DB: {ai_message.id}", file=sys.stderr)
                        
                        # Отправляем ответ обратно
                        response_data = {
                            "id": ai_message.id,
                            "role": "assistant",
                            "content": ai_response,
                            "created_at": ai_message.created_at.isoformat(),
                            "is_voice": 0
                        }
                        await websocket.send_text(json.dumps(response_data))
                        print(f"[WebSocket] Response sent via WebSocket: {ai_message.id}", file=sys.stderr)
                    except json.JSONDecodeError as e:
                        print(f"[WebSocket] JSON decode error: {e}", file=sys.stderr)
                        await websocket.send_text(json.dumps({
                            "error": "Invalid JSON format",
                            "details": str(e)
                        }))
                    except Exception as e:
                        print(f"[WebSocket] Error processing message: {str(e)}", file=sys.stderr)
                        await websocket.send_text(json.dumps({
                            "error": "Error processing message",
                            "details": str(e)
                        }))
                    
            except WebSocketDisconnect:
                if chat_id in active_connections and websocket in active_connections[chat_id]:
                    active_connections[chat_id].remove(websocket)
                    print(f"[WebSocket] Disconnected for chat {chat_id}", file=sys.stderr)
        except Exception as e:
            print(f"[WebSocket] Error in WebSocket handler: {str(e)}", file=sys.stderr)
            if chat_id in active_connections and websocket in active_connections[chat_id]:
                active_connections[chat_id].remove(websocket)
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    except Exception as e:
        print(f"[WebSocket] Failed to accept connection: {str(e)}", file=sys.stderr) 