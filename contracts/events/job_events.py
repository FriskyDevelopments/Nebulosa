"""
Event contracts for internal async job queue messages.

These dataclasses define the shape of messages passed between
the webhook receiver, ingest worker, and agent worker.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class InstallSyncEvent:
    """Enqueued when a new GitHub App installation is created."""

    github_installation_id: int
    account_login: str
    account_type: str
    repositories: list[dict] = field(default_factory=list)


@dataclass
class FullScanEvent:
    """Enqueued to trigger a full repository scan."""

    repository_id: str          # UUID string
    owner: str
    repo: str
    default_branch: Optional[str] = None


@dataclass
class IncrementalRefreshEvent:
    """Enqueued when a push/pull_request/issues/release webhook arrives."""

    repository_id: str          # UUID string
    owner: str
    repo: str
    before_sha: str
    after_sha: str
    changed_files: list[str] = field(default_factory=list)


@dataclass
class RunTaskEvent:
    """Enqueued when a user submits an architecture analysis task."""

    task_id: str                # UUID string
    repository_id: str          # UUID string
    task_type: str
    snapshot_id: Optional[str] = None
