"""
Clone a GitHub repository to a local directory using an installation token.

This is a thin wrapper around ``GitHubGitClient.clone`` that is suitable
for use as a pipeline stage.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from integrations.github.git_client import GitHubGitClient

logger = logging.getLogger(__name__)


async def clone_repository(
    git_client: GitHubGitClient,
    owner: str,
    repo: str,
    *,
    target_dir: Optional[Path] = None,
    branch: Optional[str] = None,
    depth: Optional[int] = None,
) -> Path:
    """
    Clone *owner/repo* to *target_dir* and return the path.

    Parameters
    ----------
    git_client:
        Configured ``GitHubGitClient`` instance.
    owner:
        Repository owner.
    repo:
        Repository name.
    target_dir:
        Destination path. A temporary directory is used when omitted.
    branch:
        Branch/ref to check out.
    depth:
        Shallow clone depth; ``None`` for a full clone.

    Returns
    -------
    Path
        Path to the cloned repository root.
    """
    logger.info("Cloning %s/%s …", owner, repo)
    path = await git_client.clone(
        owner,
        repo,
        target_dir=target_dir,
        branch=branch,
        depth=depth,
    )
    logger.info("Cloned %s/%s → %s", owner, repo, path)
    return path
