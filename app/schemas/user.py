from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserInfo(UserBase):
    id: Optional[int] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user_info: Dict

class TokenData(BaseModel):
    username: Optional[str] = None
    
class RefreshToken(BaseModel):
    refresh_token: str 