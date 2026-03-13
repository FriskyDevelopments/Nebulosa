"""
Task management API routes.

Endpoints:
  POST /v1/tasks
  GET  /v1/tasks/{taskId}
  GET  /v1/tasks/{taskId}/report
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from apps.api.src.schemas.api_schemas import (
    CreateTaskRequest,
    ReportResponse,
    TaskResponse,
)
from domain.tasks.entities import Task, TaskType

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_task(
    body: CreateTaskRequest,
    request: Request,
    task_store: Any = Depends(lambda: None),
    queue: Any = Depends(lambda: None),
) -> TaskResponse:
    """
    Submit an architecture analysis task.

    The task is enqueued immediately and executed asynchronously.
    Poll ``GET /v1/tasks/{taskId}`` for status.
    """
    try:
        task_type = TaskType(body.task_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown task_type: {body.task_type}",
        )

    # Identify the requesting user (simplified – use auth middleware in production)
    requested_by = request.headers.get("x-user-id", "anonymous")

    task = Task.create(
        repository_id=body.repository_id,
        task_type=task_type,
        prompt=body.prompt,
        requested_by=requested_by,
        snapshot_id=body.snapshot_id,
    )

    if task_store is not None:
        await task_store.save_task(task)

    # In production: queue.enqueue("run_task", task_id=str(task.id))

    return _task_to_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    task_store: Any = Depends(lambda: None),
) -> TaskResponse:
    """Return the current status of a task."""
    if task_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task = await task_store.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _task_to_response(task)


@router.get("/{task_id}/report", response_model=ReportResponse)
async def get_task_report(
    task_id: uuid.UUID,
    report_store: Any = Depends(lambda: None),
) -> ReportResponse:
    """Return the generated report for a completed task."""
    if report_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    report = await report_store.get_report_by_task(task_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _report_to_response(report)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _task_to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        repository_id=task.repository_id,
        snapshot_id=task.snapshot_id,
        task_type=task.task_type.value,
        prompt=task.prompt,
        status=task.status.value,
        requested_by=task.requested_by,
        created_at=task.created_at,
        completed_at=task.completed_at,
    )


def _report_to_response(report: Any) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        task_id=report.task_id,
        report_type=report.report_type,
        markdown_content=report.markdown_content,
        artifact_ref=report.artifact_ref,
        created_at=report.created_at,
    )
