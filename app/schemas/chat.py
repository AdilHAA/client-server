from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MessageBase(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    is_voice: int = 0

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    chat_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatBase(BaseModel):
    title: str

class ChatCreate(ChatBase):
    pass

class Chat(ChatBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatResponse(ChatBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_message: Optional[str] = None

class ChatListResponse(BaseModel):
    chats: List[ChatResponse] 