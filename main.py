import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, chat, voice
from app.database.init_db import create_tables

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True) 