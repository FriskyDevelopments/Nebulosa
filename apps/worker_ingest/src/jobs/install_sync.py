"""
Installation sync job.

Called when a new GitHub App installation webhook arrives.
Creates installation and repository records, then enqueues full scans.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from domain.repositories.entities import GitHubInstallation, Repository
from integrations.github.rest_client import GitHubRESTClient

logger = logging.getLogger(__name__)


async def sync_installation(
    *,
    github_installation_id: int,
    account_login: str,
    account_type: str,
    rest_client: GitHubRESTClient,
) -> tuple[GitHubInstallation, list[Repository]]:
    """
    Sync a new GitHub App installation and its accessible repositories.

    Parameters
    ----------
    github_installation_id:
        Numeric installation ID from the webhook payload.
    account_login:
        Login of the account (user or org) that installed the app.
    account_type:
        ``"User"`` or ``"Organization"``.
    rest_client:
        REST client authenticated as the installation.

    Returns
    -------
    tuple[GitHubInstallation, list[Repository]]
        The created installation record and the list of discovered repositories.
    """
    installation = GitHubInstallation.create(
        github_installation_id=github_installation_id,
        account_login=account_login,
        account_type=account_type,
    )
    logger.info(
        "Created installation record for %s (%s)", account_login, account_type
    )

    # Fetch all repositories accessible to this installation
    repos: list[Repository] = []
    async for repo_data in rest_client.paginate(
        "/installation/repositories", page_size=100
    ):
        repo = Repository.create(
            installation_id=installation.id,
            github_repo_id=repo_data["id"],
            owner=repo_data["owner"]["login"],
            name=repo_data["name"],
            default_branch=repo_data.get("default_branch"),
            is_private=repo_data.get("private", False),
        )
        repos.append(repo)
        logger.info("Discovered repository: %s/%s", repo.owner, repo.name)

    logger.info(
        "Installation %s synced: %d repositories found",
        account_login,
        len(repos),
    )
    return installation, repos
