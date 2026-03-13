"""
Report retrieval API routes.

Endpoints:
  GET /v1/repositories/{repoId}/reports
  GET /v1/reports/{reportId}
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.src.schemas.api_schemas import ReportResponse

router = APIRouter(tags=["reports"])


@router.get("/v1/repositories/{repo_id}/reports", response_model=list[ReportResponse])
async def list_repository_reports(
    repo_id: uuid.UUID,
    report_store: Any = Depends(lambda: None),
) -> list[ReportResponse]:
    """Return all reports generated for a repository (newest first)."""
    if report_store is None:
        return []
    reports = await report_store.list_reports_for_repository(repo_id)
    return [
        ReportResponse(
            id=r.id,
            task_id=r.task_id,
            report_type=r.report_type,
            markdown_content=r.markdown_content,
            artifact_ref=r.artifact_ref,
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/v1/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    report_store: Any = Depends(lambda: None),
) -> ReportResponse:
    """Return a single report by ID."""
    if report_store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    report = await report_store.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return ReportResponse(
        id=report.id,
        task_id=report.task_id,
        report_type=report.report_type,
        markdown_content=report.markdown_content,
        artifact_ref=report.artifact_ref,
        created_at=report.created_at,
    )
