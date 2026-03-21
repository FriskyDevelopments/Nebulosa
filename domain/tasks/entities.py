"""Domain entities for agent tasks."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class TaskType(str, Enum):
    ARCHITECTURE_REPORT = "architecture_report"
    ARCHITECTURE_PROBLEMS = "architecture_problems"
    TARGET_ARCHITECTURE = "target_architecture"
    SERVICE_BOUNDARIES = "service_boundaries"
    FOLDER_STRUCTURE = "folder_structure"
    DATABASE_DESIGN = "database_design"
    API_DESIGN = "api_design"
    DEPLOYMENT_DESIGN = "deployment_design"
    ROADMAP = "roadmap"
    REPO_COMPARE = "repo_compare"
    REPO_SEPARATION = "repo_separation"


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    """An architecture analysis task submitted by a user."""

    id: uuid.UUID
    repository_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID]
    task_type: TaskType
    prompt: str
    status: TaskStatus
    requested_by: str
    created_at: datetime
    completed_at: Optional[datetime]

    @classmethod
    def create(
        cls,
        repository_id: uuid.UUID,
        task_type: TaskType,
        prompt: str,
        requested_by: str,
        *,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> "Task":
        return cls(
            id=uuid.uuid4(),
            repository_id=repository_id,
            snapshot_id=snapshot_id,
            task_type=task_type,
            prompt=prompt,
            status=TaskStatus.QUEUED,
            requested_by=requested_by,
            created_at=datetime.now(timezone.utc),
            completed_at=None,
        )

    def mark_running(self) -> None:
        self.status = TaskStatus.RUNNING

    def mark_completed(self) -> None:
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)

    def mark_failed(self) -> None:
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.now(timezone.utc)
