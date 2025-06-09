from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
import sys

from app.database.init_db import get_db
from app.models.user import User
from app.schemas.user import TokenData

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "my_super_secret_key_for_development_only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token, verify_type=None):
    try:
        print(f"Decoding token: {token[:10]}... (type check: {verify_type})", file=sys.stderr)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Проверяем тип токена, если требуется
        if verify_type and payload.get("type") != verify_type:
            print(f"Token type mismatch: expected {verify_type}, got {payload.get('type')}", file=sys.stderr)
            return None
            
        username = payload.get("sub")
        if username is None:
            print(f"No 'sub' field in token payload", file=sys.stderr)
            return None
            
        # Проверяем срок действия (хотя jwt.decode уже должен это проверить)
        exp = payload.get("exp")
        if exp is None:
            return None
            
        try:
            exp_datetime = datetime.fromtimestamp(float(exp))
            if exp_datetime < datetime.utcnow():
                print(f"Token expired at {exp_datetime}", file=sys.stderr)
                return None
        except (ValueError, TypeError) as e:
            print(f"Error parsing token expiration: {str(e)}", file=sys.stderr)
            return None
            
        return {"username": username, "exp": exp, "type": payload.get("type")}
    except JWTError as e:
        print(f"JWT Error: {str(e)}", file=sys.stderr)
        return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    print(f"Authenticating user with token: {token[:10] if token else 'None'}...", file=sys.stderr)
    user_data = decode_token(token, verify_type="access")
    if user_data is None:
        print(f"Authentication failed: invalid token", file=sys.stderr)
        raise credentials_exception
    
    username = user_data["username"]
    user = db.query(User).filter(User.username == username).first()
    
    if user is None:
        print(f"Authentication failed: user {username} not found", file=sys.stderr)
        raise credentials_exception
    
    print(f"Authentication successful for user: {username}", file=sys.stderr)
    return user 