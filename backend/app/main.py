import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, contacts, conversations, messages, users, ws


# Create database tables
Base.metadata.create_all(bind=engine)


# Create FastAPI application
app = FastAPI(title="Signal Clone API")


# Frontend URL
frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://signal-clone-ecru.vercel.app"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://signal-clone-ecru.vercel.app",
        "https://signal-clone-cr4l2ux8s-rakhi-singhs-projects-c436e58a.vercel.app",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(ws.router)


# Health check
@app.get("/api/health")
def health():
    return {"status": "ok"}