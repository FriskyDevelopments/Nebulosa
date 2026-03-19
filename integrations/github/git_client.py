"""
GitHub Git client for cloning and fetching repositories via HTTPS.

Uses installation access tokens for HTTP-based Git access, which is
supported for GitHub App installations with Contents: read permission.
"""
from __future__ import annotations

import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse, urlunparse

import git

logger = logging.getLogger(__name__)


class GitHubGitClient:
    """
    Clone or fetch a GitHub repository using an installation access token.

    The token is embedded in the HTTPS URL as a credential, which is the
    documented approach for GitHub App installation token authentication.
    """

    _BASE = "https://github.com"

    def __init__(self, token_provider: Any) -> None:
        """
        Parameters
        ----------
        token_provider:
            Async callable ``() -> str`` returning a valid installation token.
        """
        self._token_provider = token_provider

    # ------------------------------------------------------------------
    # Clone
    # ------------------------------------------------------------------

    async def clone(
        self,
        owner: str,
        repo: str,
        *,
        target_dir: Optional[Path] = None,
        branch: Optional[str] = None,
        depth: Optional[int] = None,
    ) -> Path:
        """
        Clone a repository and return the path to the working directory.

        Parameters
        ----------
        owner:
            Repository owner (user or organization).
        repo:
            Repository name.
        target_dir:
            Directory to clone into.  A temporary directory is created when
            omitted – caller is responsible for cleanup in that case.
        branch:
            Branch/tag/ref to check out.  Defaults to the default branch.
        depth:
            Shallow clone depth.  ``None`` performs a full clone.

        Returns
        -------
        Path
            Absolute path to the cloned working tree.
        """
        token = await self._token_provider()
        clone_url = self._build_auth_url(owner, repo, token)

        if target_dir is None:
            target_dir = Path(tempfile.mkdtemp(prefix="nebulosa-repo-"))

        kwargs: dict = {
            "to_path": str(target_dir),
        }
        if branch:
            kwargs["branch"] = branch
        if depth is not None:
            kwargs["depth"] = depth

        logger.info("Cloning %s/%s → %s", owner, repo, target_dir)
        git.Repo.clone_from(clone_url, **kwargs)
        logger.info("Clone complete: %s/%s", owner, repo)
        return target_dir

    # ------------------------------------------------------------------
    # Fetch (update existing clone)
    # ------------------------------------------------------------------

    async def fetch(self, repo_path: Path, owner: str, repo: str) -> None:
        """
        Fetch the latest changes into an existing local clone.

        Updates the remote URL with a fresh token before fetching.
        """
        token = await self._token_provider()
        clone_url = self._build_auth_url(owner, repo, token)

        local_repo = git.Repo(str(repo_path))
        origin = local_repo.remotes["origin"]
        origin.set_url(clone_url)

        logger.info("Fetching %s/%s", owner, repo)
        origin.fetch()
        logger.info("Fetch complete: %s/%s", owner, repo)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_auth_url(owner: str, repo: str, token: str) -> str:
        """Return a token-authenticated HTTPS clone URL."""
        return f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"

    @staticmethod
    def cleanup(repo_path: Path) -> None:
        """Remove a cloned repository directory."""
        if repo_path.exists():
            shutil.rmtree(repo_path, ignore_errors=True)
            logger.debug("Removed clone directory: %s", repo_path)
