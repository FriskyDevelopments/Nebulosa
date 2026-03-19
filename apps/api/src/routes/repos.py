"""
Repository management API routes.

Endpoints:
  GET  /v1/repositories
  GET  /v1/repositories/{repoId}
  POST /v1/repositories/{repoId}/scan
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.src.schemas.api_schemas import (
    RepositoryResponse,
    SnapshotResponse,
    TriggerScanRequest,
)

router = APIRouter(prefix="/v1/repositories", tags=["repositories"])


@router.get("", response_model=list[RepositoryResponse])
async def list_repositories(
    repo_store: Any = Depends(lambda: None),
) -> list[dict]:
    """Return all active repositories registered with the system."""
    if repo_store is None:
        return []
    repos = await repo_store.list_active_repositories()
    return [
        RepositoryResponse(
            id=r.id,
            installation_id=r.installation_id,
            github_repo_id=r.github_repo_id,
            owner=r.owner,
            name=r.name,
            full_name=r.full_name,
            default_branch=r.default_branch,
            is_private=r.is_private,
            language_summary=r.language_summary,
            active=r.active,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in repos
    ]


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(
    repo_id: uuid.UUID,
    repo_store: Any = Depends(lambda: None),
) -> RepositoryResponse:
    """Return details for a single repository."""
    if repo_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    repo = await repo_store.get_repository(repo_id)
    if repo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return RepositoryResponse(
        id=repo.id,
        installation_id=repo.installation_id,
        github_repo_id=repo.github_repo_id,
        owner=repo.owner,
        name=repo.name,
        full_name=repo.full_name,
        default_branch=repo.default_branch,
        is_private=repo.is_private,
        language_summary=repo.language_summary,
        active=repo.active,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
    )


@router.post("/{repo_id}/scan", response_model=SnapshotResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(
    repo_id: uuid.UUID,
    body: TriggerScanRequest,
    repo_store: Any = Depends(lambda: None),
    queue: Any = Depends(lambda: None),
) -> SnapshotResponse:
    """
    Trigger a full repository scan.

    Enqueues a scan job and returns a ``queued`` snapshot record immediately.
    Poll ``GET /v1/repositories/{repoId}`` or the task endpoint for status.
    """
    if repo_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    repo = await repo_store.get_repository(repo_id)
    if repo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    from domain.scans.entities import RepositorySnapshot
    snapshot = RepositorySnapshot.create(repo_id, "pending")
    # In a real deployment, enqueue: queue.enqueue("full_scan", repo_id=repo_id, branch=body.branch)

    return SnapshotResponse(
        id=snapshot.id,
        repository_id=snapshot.repository_id,
        commit_sha=snapshot.commit_sha,
        tree_sha=snapshot.tree_sha,
        snapshot_status=snapshot.snapshot_status.value,
        file_count=snapshot.file_count,
        created_at=snapshot.created_at,
        completed_at=snapshot.completed_at,
    )
