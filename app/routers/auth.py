from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import sys

from app.database.init_db import get_db
from app.models.user import User
from app.schemas.user import UserCreate, Token, UserInfo, RefreshToken
from app.utils.auth import (
    authenticate_user, 
    create_access_token, 
    create_refresh_token, 
    get_password_hash, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    decode_token
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Проверка, существует ли пользователь с таким именем
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Проверка, существует ли пользователь с таким email
    if user.email:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Создаем нового пользователя
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"Registered new user: {user.username}", file=sys.stderr)
    return {"message": "User created successfully"}

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Создаем refresh token
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    print(f"User logged in: {user.username}", file=sys.stderr)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_info": {
            "username": user.username,
            "email": user.email
        }
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(token_data: RefreshToken, db: Session = Depends(get_db)):
    refresh_token = token_data.refresh_token
    
    # Проверяем refresh token
    user_data = decode_token(refresh_token, verify_type="refresh")
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем пользователя
    username = user_data["username"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем новый access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Создаем новый refresh token
    new_refresh_token = create_refresh_token(data={"sub": user.username})
    
    print(f"Tokens refreshed for user: {user.username}", file=sys.stderr)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_info": {
            "username": user.username,
            "email": user.email
        }
    } 