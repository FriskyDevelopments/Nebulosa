"""
Incremental refresh job.

When a push or pull_request webhook is received, this job:
  1. Determines which files changed since the last snapshot
  2. Re-classifies and re-indexes only those files
  3. Updates (or creates) a snapshot record

This is much cheaper than a full scan for small changes.
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
from domain.scans.entities import FileType, RepositoryFile, RepositorySnapshot
from integrations.github.git_client import GitHubGitClient
from integrations.github.rest_client import GitHubRESTClient

logger = logging.getLogger(__name__)


async def run_incremental_refresh(
    *,
    repository_id: uuid.UUID,
    owner: str,
    repo: str,
    before_sha: str,
    after_sha: str,
    rest_client: GitHubRESTClient,
    git_client: GitHubGitClient,
    storage_backend: Any = None,
) -> RepositorySnapshot:
    """
    Re-index only the files that changed between *before_sha* and *after_sha*.

    Parameters
    ----------
    repository_id:
        Internal UUID of the repository.
    owner / repo:
        GitHub repository coordinates.
    before_sha / after_sha:
        The push range from the webhook payload.
    rest_client / git_client:
        Authenticated clients for this installation.
    storage_backend:
        Optional content storage backend.

    Returns
    -------
    RepositorySnapshot
        The new (incremental) snapshot record.
    """
    logger.info(
        "Incremental refresh %s/%s %s…%s", owner, repo, before_sha[:8], after_sha[:8]
    )

    # 1. Fetch the list of changed files via REST compare endpoint
    compare = await rest_client.get(
        f"/repos/{owner}/{repo}/compare/{before_sha}...{after_sha}"
    )
    changed_paths = {f["filename"] for f in compare.get("files", [])}
    logger.info("%d files changed in push", len(changed_paths))

    # 2. Fetch tree SHA for the new commit
    commit_data = await rest_client.get(f"/repos/{owner}/{repo}/commits/{after_sha}")
    tree_sha = (commit_data.get("commit") or {}).get("tree", {}).get("sha")

    snapshot = RepositorySnapshot.create(
        repository_id,
        after_sha,
        tree_sha=tree_sha,
    )
    snapshot.mark_running()

    repo_path: Optional[Path] = None
    try:
        # 3. Clone at the new SHA
        repo_path = await clone_repository(
            git_client, owner, repo, depth=1
        )

        # 4. Re-index only changed files
        updated_files: list[RepositoryFile] = []
        for relative_path in changed_paths:
            abs_path = repo_path / relative_path
            if not abs_path.exists():
                # File deleted – skip
                continue

            file_type = classify_file(relative_path)
            language = detect_language(relative_path)
            size_bytes = abs_path.stat().st_size
            sha256 = _hash_file(abs_path)

            repo_file = RepositoryFile.create(
                snapshot.id,
                relative_path,
                file_type,
                sha256,
                language=language,
                size_bytes=size_bytes,
            )
            updated_files.append(repo_file)

        # 5. Re-extract architecture facts for changed files
        facts = extract_architecture_facts(snapshot.id, updated_files, repo_path)
        snapshot.mark_complete(len(updated_files))

        logger.info(
            "Incremental refresh done: %d files updated, %d facts extracted",
            len(updated_files),
            len(facts),
        )

    except Exception as exc:
        logger.exception("Incremental refresh failed for %s/%s: %s", owner, repo, exc)
        snapshot.mark_failed()
    finally:
        if repo_path is not None:
            GitHubGitClient.cleanup(repo_path)

    return snapshot


def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(65536), b""):
                h.update(chunk)
    except OSError:
        pass
    return h.hexdigest()
