"""
Full repository scan job.

Orchestrates the complete ingestion pipeline for a repository:
  1. Clone the repository using an installation token
  2. Walk the file tree
  3. Classify each file
  4. Extract architecture facts
  5. Persist snapshot, files, and facts

This job is expected to be invoked by the Celery worker or directly from
the API on the first installation of a repository.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from pathlib import Path
from typing import Any, Optional

from apps.worker_ingest.src.pipeline.classify_files import classify_file, detect_language
from apps.worker_ingest.src.pipeline.clone_repo import clone_repository
from apps.worker_ingest.src.pipeline.extract_architecture import extract_architecture_facts
from apps.worker_ingest.src.pipeline.tree_walk import walk_tree
from domain.scans.entities import FileType, RepositoryFile, RepositorySnapshot
from integrations.github.git_client import GitHubGitClient
from integrations.github.rest_client import GitHubRESTClient

logger = logging.getLogger(__name__)


async def run_full_scan(
    *,
    repository_id: uuid.UUID,
    owner: str,
    repo: str,
    default_branch: Optional[str],
    rest_client: GitHubRESTClient,
    git_client: GitHubGitClient,
    storage_backend: Any = None,
) -> RepositorySnapshot:
    """
    Execute a full repository scan and return the completed snapshot.

    Parameters
    ----------
    repository_id:
        Internal UUID of the repository record.
    owner:
        GitHub repository owner (user or org).
    repo:
        GitHub repository name.
    default_branch:
        Branch to scan; defaults to the repository default branch.
    rest_client:
        Configured REST client for this installation.
    git_client:
        Configured Git client for this installation.
    storage_backend:
        Optional object-storage backend for persisting file content.
        When ``None``, content is not stored separately.

    Returns
    -------
    RepositorySnapshot
        Snapshot record marked as COMPLETE (or FAILED on error).
    """
    # 1. Fetch latest commit SHA via REST
    ref = default_branch or "HEAD"
    logger.info("Fetching latest commit for %s/%s@%s", owner, repo, ref)
    commit_data = await rest_client.get(f"/repos/{owner}/{repo}/commits/{ref}")
    commit_sha = commit_data["sha"]
    tree_sha = (commit_data.get("commit") or {}).get("tree", {}).get("sha")

    snapshot = RepositorySnapshot.create(
        repository_id,
        commit_sha,
        tree_sha=tree_sha,
    )
    snapshot.mark_running()

    repo_path: Optional[Path] = None
    try:
        # 2. Clone the repository
        repo_path = await clone_repository(git_client, owner, repo, branch=default_branch)

        # 3. Walk the tree and classify files
        repo_files: list[RepositoryFile] = []
        for relative_path, size_bytes in walk_tree(repo_path):
            file_type = classify_file(relative_path)
            language = detect_language(relative_path)

            # Compute a SHA-256 hash of the file content
            abs_path = repo_path / relative_path
            sha256 = _hash_file(abs_path)

            repo_file = RepositoryFile.create(
                snapshot.id,
                relative_path,
                file_type,
                sha256,
                language=language,
                size_bytes=size_bytes,
            )
            repo_files.append(repo_file)

        # 4. Extract architecture facts
        facts = extract_architecture_facts(snapshot.id, repo_files, repo_path)
        logger.info(
            "Extracted %d architecture facts for %s/%s", len(facts), owner, repo
        )

        snapshot.mark_complete(len(repo_files))
        logger.info(
            "Full scan complete for %s/%s: %d files, %d facts",
            owner,
            repo,
            len(repo_files),
            len(facts),
        )

    except Exception as exc:
        logger.exception("Full scan failed for %s/%s: %s", owner, repo, exc)
        snapshot.mark_failed()
    finally:
        if repo_path is not None:
            GitHubGitClient.cleanup(repo_path)

    return snapshot


def _hash_file(path: Path) -> str:
    """Return the hex SHA-256 digest of a file's content."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(65536), b""):
                h.update(chunk)
    except OSError:
        pass
    return h.hexdigest()
