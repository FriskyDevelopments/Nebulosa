"""Domain entities for GitHub installation and repository management."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class GitHubInstallation:
    """Represents a GitHub App installation on an account or org."""

    id: uuid.UUID
    github_installation_id: int
    account_login: str
    account_type: str          # "User" or "Organization"
    created_at: datetime

    @classmethod
    def create(
        cls,
        github_installation_id: int,
        account_login: str,
        account_type: str,
    ) -> "GitHubInstallation":
        return cls(
            id=uuid.uuid4(),
            github_installation_id=github_installation_id,
            account_login=account_login,
            account_type=account_type,
            created_at=datetime.now(timezone.utc),
        )


@dataclass
class Repository:
    """Represents a GitHub repository registered with the system."""

    id: uuid.UUID
    installation_id: uuid.UUID
    github_repo_id: int
    owner: str
    name: str
    default_branch: Optional[str]
    is_private: bool
    language_summary: dict
    active: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        installation_id: uuid.UUID,
        github_repo_id: int,
        owner: str,
        name: str,
        *,
        default_branch: Optional[str] = None,
        is_private: bool = False,
        language_summary: Optional[dict] = None,
    ) -> "Repository":
        now = datetime.now(timezone.utc)
        return cls(
            id=uuid.uuid4(),
            installation_id=installation_id,
            github_repo_id=github_repo_id,
            owner=owner,
            name=name,
            default_branch=default_branch,
            is_private=is_private,
            language_summary=language_summary or {},
            active=True,
            created_at=now,
            updated_at=now,
        )

    @property
    def full_name(self) -> str:
        return f"{self.owner}/{self.name}"
