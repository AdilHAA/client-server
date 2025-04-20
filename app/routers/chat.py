from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import List, Dict
import json

from app.database.init_db import get_db
from app.models.user import User
from app.models.chat import Chat, Message
from app.schemas.chat import ChatCreate, Chat as ChatSchema, ChatResponse, ChatListResponse, MessageCreate, Message as MessageSchema
from app.utils.auth import get_current_user
from app.utils.ai_agent import process_message

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
    ai_response = await process_message(message.content)
    
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
    await websocket.accept()
    
    # Валидация аутентификации
    try:
        # В WebSocket нет normal headers, получаем из query параметров
        token = websocket.query_params.get("token")
        if not token:
            auth_header = websocket.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            print(f"WebSocket closed: No authentication token provided")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Здесь должна быть полноценная валидация JWT токена
        # Но для простоты мы просто проверим его наличие
        
        # Добавляем соединение к активным
        if chat_id not in active_connections:
            active_connections[chat_id] = []
        active_connections[chat_id].append(websocket)
        print(f"WebSocket connection added for chat {chat_id}")
        
        try:
            while True:
                data = await websocket.receive_text()
                print(f"WebSocket received data: {data}")
                message_data = json.loads(data)
                
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
                print(f"User message saved to DB: {db_message.id}")
                
                # Обрабатываем с помощью AI
                ai_response = await process_message(message_data.get("content", ""))
                
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
                print(f"AI message saved to DB: {ai_message.id}")
                
                # Отправляем ответ обратно
                response_data = {
                    "id": ai_message.id,
                    "role": "assistant",
                    "content": ai_response,
                    "created_at": ai_message.created_at.isoformat(),
                    "is_voice": 0
                }
                await websocket.send_text(json.dumps(response_data))
                print(f"Response sent via WebSocket: {ai_message.id}")
                
        except WebSocketDisconnect:
            if chat_id in active_connections and websocket in active_connections[chat_id]:
                active_connections[chat_id].remove(websocket)
                print(f"WebSocket disconnected for chat {chat_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        if chat_id in active_connections and websocket in active_connections[chat_id]:
            active_connections[chat_id].remove(websocket)
        await websocket.close() 