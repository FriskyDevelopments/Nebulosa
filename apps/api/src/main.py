"""
FastAPI application entry point for the Nebulosa GitHub Architecture Agent.

Exposes all API routes and configures middleware.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.src.routes.repos import router as repos_router
from apps.api.src.routes.reports import router as reports_router
from apps.api.src.routes.tasks import router as tasks_router
from apps.api.src.routes.webhooks_github import router as webhooks_router

app = FastAPI(
    title="Nebulosa GitHub Architecture Agent",
    description=(
        "A codebase-aware software architecture agent for GitHub. "
        "Scan repositories, extract architecture facts, and produce "
        "structured architecture reports with citations."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repos_router)
app.include_router(tasks_router)
app.include_router(reports_router)
app.include_router(webhooks_router)


@app.get("/health", tags=["ops"])
async def health_check() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/v1/admin/rate-limits", tags=["admin"])
async def get_rate_limits() -> dict:
    """Return GitHub API rate-limit status (placeholder)."""
    return {"message": "Rate-limit data available after GitHub client is configured."}
