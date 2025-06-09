import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from datetime import datetime

from app.routers import auth, chat, voice
from app.database.init_db import create_tables

# Загружаем переменные из .env
load_dotenv()

# Проверка API ключей
print(f"ENV vars loaded: GIGACHAT_AUTH_TOKEN present: {'GIGACHAT_AUTH_TOKEN' in os.environ}")
print(f"SERVER SETUP: Running on host 0.0.0.0, port 8080")
print(f"CORS setup: Allowing origins: {[origin for origin in ['http://localhost:3000', 'http://localhost:8000', '*']]}")
print(f"Included routers: auth, chat, voice")

app = FastAPI(title="AI Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(voice.router)

@app.on_event("startup")
async def startup_event():
    create_tables()

@app.get("/")
async def root():
    return {"message": "AI Assistant API is running"}

@app.get("/status")
async def status():
    """Проверка статуса API и отображение всех зарегистрированных маршрутов"""
    routes = []
    for route in app.routes:
        route_info = {
            "path": getattr(route, "path", "unknown"),
            "name": getattr(route, "name", "unknown"),
            "methods": getattr(route, "methods", ["unknown"])
        }
        routes.append(route_info)
    
    websocket_routes = [r for r in routes if 'websocket' in str(r['methods']).lower()]
    
    return {
        "status": "online",
        "api_version": "1.0",
        "total_routes": len(routes),
        "websocket_routes": websocket_routes,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True) 