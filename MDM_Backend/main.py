"""
main.py
--------
SignalMDM Phase 1 — FastAPI Application Entrypoint

Startup sequence:
  1. Load environment variables
  2. Create all DB tables (DDL auto-create)
  3. Mount Phase 1 routers
  4. Expose root health-check

Run:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Import all models so SQLAlchemy sees them before create_all()
# ---------------------------------------------------------------------------
import signalmdm.models  # noqa: F401 — registers all mappers with Base

from signalmdm.database import engine, Base
from core.config import settings

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from signalmdm.routers.tenant_router    import router as tenant_router
from signalmdm.routers.source_router    import router as source_router
from signalmdm.routers.ingestion_router import router as ingestion_router


# ---------------------------------------------------------------------------
# Lifespan — runs on startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("[SignalMDM] Database tables verified / created.")
    yield
    # Shutdown (nothing to clean up for now)
    print("[SignalMDM] Shutting down.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=(
        "SignalMDM Phase 1 API — Source registration, ingestion pipeline, "
        "raw data storage, and staging entity creation."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handler — ensures StandardResponse format on unhandled errors
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred.",
            "data": None,
            "errors": [str(exc)],
        },
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

PREFIX = "/api/v1"

app.include_router(tenant_router,    prefix=PREFIX)
app.include_router(source_router,    prefix=PREFIX)
app.include_router(ingestion_router, prefix=PREFIX)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "SignalMDM Backend Running",
        "version": settings.app_version,
        "environment": settings.app_env,
        "phase": "Phase 1 — Ingestion Foundation",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    """Kubernetes / load balancer health probe."""
    return {"status": "ok"}
