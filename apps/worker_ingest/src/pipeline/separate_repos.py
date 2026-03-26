"""
Repository separation pipeline stage.

Classifies each file in a mixed Nebulosa/StixMagic repository as belonging
to one of four ``RepoOwner`` categories:

- ``NEBULOSA``   – Zoom automation, OAuth, server infrastructure, Python pipeline.
- ``STIX_MAGIC`` – Telegram sticker bot, Magic Center, draft/sticker services.
- ``SHARED``     – Deployment configs and CI that could apply to either project.
- ``UNKNOWN``    – Cannot be determined from path or content signals alone.
"""
from __future__ import annotations

import re
from enum import Enum
from pathlib import PurePosixPath
from typing import Optional


class RepoOwner(str, Enum):
    """Which logical project owns a repository file."""

    NEBULOSA = "nebulosa"
    STIX_MAGIC = "stix_magic"
    SHARED = "shared"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Path-based signals
# ---------------------------------------------------------------------------

# Any path that starts with (or equals) one of these prefixes belongs to StixMagic.
_STIXMAGIC_PATH_PREFIXES: tuple[str, ...] = (
    "stixmagic/",
    "bot/",
    "services/",
    "workers/",
    "models/",
    "config/limits",
)

# Exact file names (basename) that are StixMagic entry points / configs.
_STIXMAGIC_EXACT_FILES: frozenset[str] = frozenset(
    {
        "stixmagic-bot.js",
    }
)

# Any path containing one of these substrings belongs to StixMagic.
_STIXMAGIC_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(r"(^|/)bot/", re.I),
    re.compile(r"(^|/)stixmagic/", re.I),
    re.compile(r"(^|/)models/storage\.js$", re.I),
    re.compile(r"(^|/)config/limits\.js$", re.I),
    re.compile(r"(^|/)workers/cleanup", re.I),
    re.compile(r"(^|/)services/(sticker|draft|usage|cleanup)Service", re.I),
]

# Path patterns that indicate Nebulosa-specific content.
_NEBULOSA_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(r"(^|/)server/", re.I),
    re.compile(r"(^|/)shared/schema\.", re.I),
    re.compile(r"(^|/)oauth", re.I),
    re.compile(r"zoom", re.I),
    re.compile(r"(^|/)apps/api/", re.I),
    re.compile(r"(^|/)apps/worker_ingest/", re.I),
    re.compile(r"(^|/)apps/worker_agent/", re.I),
    re.compile(r"(^|/)domain/", re.I),
    re.compile(r"(^|/)contracts/", re.I),
    re.compile(r"(^|/)infrastructure/", re.I),
    re.compile(r"(^|/)integrations/github/", re.I),
    re.compile(r"(^|/)scripts/", re.I),
    re.compile(r"(^|/)tests/", re.I),
    re.compile(r"railway-complete-bot\.js$", re.I),
    re.compile(r"railway-bot", re.I),
    re.compile(r"admin-panel\.js$", re.I),
    re.compile(r"production-bot\.js$", re.I),
]

# Deployment files that are legitimately shared between both projects.
_SHARED_EXACT_FILES: frozenset[str] = frozenset(
    {
        "dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "procfile",
        "railway.json",
        "render.yaml",
        "package.json",
        "package-lock.json",
        ".env.example",
        ".gitignore",
        ".dockerignore",
        "readme.md",
        "license",
    }
)

_SHARED_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(r"(^|/)\.github/workflows/", re.I),
]

# ---------------------------------------------------------------------------
# Content-based signals (applied when path is ambiguous)
# ---------------------------------------------------------------------------

_STIXMAGIC_CONTENT_SIGNALS: list[re.Pattern] = [
    re.compile(r"magic\s*cut|magic\s*center|magicCenter|MagicCenter", re.I),
    re.compile(r"stickerHandler|draftHandler|catalogHandler|animationHandler", re.I),
    re.compile(r"stickerService|draftService|usageService|cleanupService", re.I),
    re.compile(r"stixmagic", re.I),
    re.compile(r"Draft\s*Vault|draft_vault", re.I),
    re.compile(r"node-telegram-bot-api", re.I),
]

_NEBULOSA_CONTENT_SIGNALS: list[re.Pattern] = [
    re.compile(r"zoomAuth|zoom\s*oauth|zoom\.us", re.I),
    re.compile(r"puppeteer.*zoom|joinZoom", re.I),
    re.compile(r"from fastapi|import fastapi", re.I),
    re.compile(r"RepositorySnapshot|ArchitectureFact|RetrievalPlan", re.I),
    re.compile(r"GitHubAppAuth|GitHubWebhookHandler", re.I),
    re.compile(r"nebulosa", re.I),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def classify_ownership(path: str, content: Optional[str] = None) -> RepoOwner:
    """
    Determine which logical project owns the given repository file.

    Parameters
    ----------
    path:
        Repository-relative POSIX path (e.g. ``"bot/index.js"``).
    content:
        Optional text content of the file.  When provided, content signals
        are used to break ties that cannot be resolved from the path alone.

    Returns
    -------
    RepoOwner
        The inferred owner of the file.
    """
    pure = PurePosixPath(path)
    name_lower = pure.name.lower()
    path_lower = path.lower()

    # 1. Exact-name shortcuts
    if name_lower in _STIXMAGIC_EXACT_FILES:
        return RepoOwner.STIX_MAGIC

    if name_lower in _SHARED_EXACT_FILES:
        return RepoOwner.SHARED

    # 2. Shared path patterns (CI/CD workflows)
    for pattern in _SHARED_PATH_PATTERNS:
        if pattern.search(path_lower):
            return RepoOwner.SHARED

    # 3. StixMagic path patterns
    for pattern in _STIXMAGIC_PATH_PATTERNS:
        if pattern.search(path):  # preserve original case for basename matching
            return RepoOwner.STIX_MAGIC

    # 4. Nebulosa path patterns
    for pattern in _NEBULOSA_PATH_PATTERNS:
        if pattern.search(path_lower):
            return RepoOwner.NEBULOSA

    # 5. Content-based tiebreakers
    if content:
        stix_hits = sum(1 for p in _STIXMAGIC_CONTENT_SIGNALS if p.search(content))
        neb_hits = sum(1 for p in _NEBULOSA_CONTENT_SIGNALS if p.search(content))

        if stix_hits > neb_hits:
            return RepoOwner.STIX_MAGIC
        if neb_hits > stix_hits:
            return RepoOwner.NEBULOSA
        if stix_hits > 0:  # tie with at least one hit each → shared logic
            return RepoOwner.SHARED

    return RepoOwner.UNKNOWN


def classify_ownership_bulk(
    paths: list[str],
    contents: Optional[dict[str, str]] = None,
) -> dict[str, RepoOwner]:
    """
    Classify a list of file paths in one call.

    Parameters
    ----------
    paths:
        Repository-relative paths to classify.
    contents:
        Optional mapping of ``path → file content`` for content-based signals.

    Returns
    -------
    dict[str, RepoOwner]
        Mapping of each path to its inferred owner.
    """
    contents = contents or {}
    return {p: classify_ownership(p, contents.get(p)) for p in paths}
