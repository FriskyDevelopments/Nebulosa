"""Domain entities for repository snapshot scanning."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class SnapshotStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class FileType(str, Enum):
    CODE = "code"
    DOC = "doc"
    CONFIG = "config"
    INFRA = "infra"
    ASSET = "asset"
    OTHER = "other"


@dataclass
class RepositorySnapshot:
    """A point-in-time snapshot of a repository at a specific commit."""

    id: uuid.UUID
    repository_id: uuid.UUID
    commit_sha: str
    tree_sha: Optional[str]
    snapshot_status: SnapshotStatus
    file_count: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    @classmethod
    def create(
        cls,
        repository_id: uuid.UUID,
        commit_sha: str,
        *,
        tree_sha: Optional[str] = None,
    ) -> "RepositorySnapshot":
        return cls(
            id=uuid.uuid4(),
            repository_id=repository_id,
            commit_sha=commit_sha,
            tree_sha=tree_sha,
            snapshot_status=SnapshotStatus.QUEUED,
            file_count=None,
            created_at=datetime.now(timezone.utc),
            completed_at=None,
        )

    def mark_running(self) -> None:
        self.snapshot_status = SnapshotStatus.RUNNING

    def mark_complete(self, file_count: int) -> None:
        self.snapshot_status = SnapshotStatus.COMPLETE
        self.file_count = file_count
        self.completed_at = datetime.now(timezone.utc)

    def mark_failed(self) -> None:
        self.snapshot_status = SnapshotStatus.FAILED
        self.completed_at = datetime.now(timezone.utc)


@dataclass
class RepositoryFile:
    """A single file entry within a repository snapshot."""

    id: uuid.UUID
    snapshot_id: uuid.UUID
    path: str
    file_type: FileType
    language: Optional[str]
    size_bytes: Optional[int]
    content_ref: Optional[str]   # Object storage key
    hash_sha256: str

    @classmethod
    def create(
        cls,
        snapshot_id: uuid.UUID,
        path: str,
        file_type: FileType,
        hash_sha256: str,
        *,
        language: Optional[str] = None,
        size_bytes: Optional[int] = None,
        content_ref: Optional[str] = None,
    ) -> "RepositoryFile":
        return cls(
            id=uuid.uuid4(),
            snapshot_id=snapshot_id,
            path=path,
            file_type=file_type,
            language=language,
            size_bytes=size_bytes,
            content_ref=content_ref,
            hash_sha256=hash_sha256,
        )
