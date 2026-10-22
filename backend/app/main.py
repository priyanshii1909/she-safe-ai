"""
SHE SAFE AI — FastAPI Backend Application

Main entry point for the backend server.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import database
from app.routers import ai, sos, location, journey, contacts, map, safety_session, routes, places


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("[SHE SAFE AI] Initializing database...")
    await database.init_db()
    await database.seed_demo_data()
    await database.seed_demo_places()
    print("[SHE SAFE AI] Database ready. Demo contacts seeded.")
    print(f"[SHE SAFE AI] Server starting on {settings.host}:{settings.port}")
    yield
    # Shutdown
    print("[SHE SAFE AI] Server shutting down...")


app = FastAPI(
    title="SHE SAFE AI",
    description="AI-powered student safety companion backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
origins = settings.cors_origins.split(",") if settings.cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai.router)
app.include_router(sos.router)
app.include_router(location.router)
app.include_router(journey.router)
app.include_router(contacts.router)
app.include_router(map.router)
app.include_router(safety_session.router)
app.include_router(routes.router)
app.include_router(places.router)


@app.get("/")
async def root():
    """Root endpoint — health check."""
    return {
        "app": "SHE SAFE AI",
        "status": "running",
        "version": "1.0.0",
        "tagline": "Helping students take the first safe step toward human help.",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
