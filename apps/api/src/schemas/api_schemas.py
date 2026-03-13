"""
Pydantic request/response schemas for the API layer.

These schemas are used by FastAPI for validation, serialisation, and
OpenAPI documentation generation.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


class UUIDResponse(BaseModel):
    id: uuid.UUID


# ---------------------------------------------------------------------------
# Repositories
# ---------------------------------------------------------------------------


class RepositoryResponse(BaseModel):
    id: uuid.UUID
    installation_id: uuid.UUID
    github_repo_id: int
    owner: str
    name: str
    full_name: str
    default_branch: Optional[str]
    is_private: bool
    language_summary: dict
    active: bool
    created_at: datetime
    updated_at: datetime


class SnapshotResponse(BaseModel):
    id: uuid.UUID
    repository_id: uuid.UUID
    commit_sha: str
    tree_sha: Optional[str]
    snapshot_status: str
    file_count: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]


class TriggerScanRequest(BaseModel):
    branch: Optional[str] = Field(None, description="Branch to scan; defaults to the repository default branch")


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------


class CreateTaskRequest(BaseModel):
    repository_id: uuid.UUID
    task_type: str = Field(
        ...,
        description="One of: architecture_report, architecture_problems, target_architecture, "
                    "service_boundaries, folder_structure, database_design, api_design, "
                    "deployment_design, roadmap, repo_compare",
    )
    prompt: str = Field(..., min_length=1, max_length=4096)
    snapshot_id: Optional[uuid.UUID] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    repository_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID]
    task_type: str
    prompt: str
    status: str
    requested_by: str
    created_at: datetime
    completed_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------


class ReportResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    report_type: str
    markdown_content: str
    artifact_ref: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------


class WebhookAckResponse(BaseModel):
    status: str = "accepted"
    delivery_id: str


# ---------------------------------------------------------------------------
# Installations
# ---------------------------------------------------------------------------


class InstallationSyncRequest(BaseModel):
    github_installation_id: int


class InstallationResponse(BaseModel):
    id: uuid.UUID
    github_installation_id: int
    account_login: str
    account_type: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Rate limits (admin)
# ---------------------------------------------------------------------------


class RateLimitResponse(BaseModel):
    core: Optional[dict] = None
    search: Optional[dict] = None
    graphql: Optional[dict] = None
    raw: dict
