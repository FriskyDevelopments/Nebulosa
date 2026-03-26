"""
Separation report generator.

Produces a structured Markdown report that identifies which files in a
mixed Nebulosa/StixMagic repository belong to each project, surfaces
overlaps, and recommends concrete refactoring steps to achieve clear
repository boundaries.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from apps.worker_ingest.src.pipeline.separate_repos import RepoOwner, classify_ownership_bulk
from domain.reports.entities import Report
from domain.scans.entities import RepositoryFile


def generate_separation_report(
    *,
    task_id: uuid.UUID,
    owner: str,
    repo: str,
    commit_sha: str,
    files: list[RepositoryFile],
    github_base_url: str = "https://github.com",
) -> Report:
    """
    Build a ``Report`` that separates Nebulosa files from StixMagic files.

    Parameters
    ----------
    task_id:
        The task this report belongs to.
    owner / repo:
        GitHub repository coordinates used for citation links.
    commit_sha:
        The snapshot commit SHA (used in file permalink links).
    files:
        File records from the snapshot.
    github_base_url:
        Base URL for GitHub file permalinks.

    Returns
    -------
    Report
        Structured report entity with Markdown content.
    """
    repo_url = f"{github_base_url}/{owner}/{repo}"
    short_sha = commit_sha[:8]

    # Classify every file
    paths = [f.path for f in files]
    ownership: dict[str, RepoOwner] = classify_ownership_bulk(paths)

    # Group by owner
    by_owner: dict[RepoOwner, list[RepositoryFile]] = defaultdict(list)
    for f in files:
        by_owner[ownership[f.path]].append(f)

    nebulosa_files = by_owner[RepoOwner.NEBULOSA]
    stixmagic_files = by_owner[RepoOwner.STIX_MAGIC]
    shared_files = by_owner[RepoOwner.SHARED]
    unknown_files = by_owner[RepoOwner.UNKNOWN]

    def file_link(f: RepositoryFile) -> str:
        return f"[`{f.path}`]({repo_url}/blob/{commit_sha}/{f.path})"

    lines: list[str] = []

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------
    lines += [
        f"# Repository Separation Report: {owner}/{repo}",
        "",
        f"> **Snapshot:** `{short_sha}` — Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "This report distinguishes **Nebulosa** (Zoom automation platform) files "
        "from **StixMagic** (Telegram sticker bot) files that currently co-exist "
        "in the same repository.  It provides concrete recommendations for "
        "establishing clear project boundaries.",
        "",
    ]

    # ------------------------------------------------------------------
    # Summary table
    # ------------------------------------------------------------------
    lines += [
        "## Summary",
        "",
        "| Category | Files |",
        "|----------|-------|",
        f"| 🌌 Nebulosa-only | {len(nebulosa_files)} |",
        f"| ✨ StixMagic-only | {len(stixmagic_files)} |",
        f"| 🔗 Shared / Infrastructure | {len(shared_files)} |",
        f"| ❓ Unknown / Unclassified | {len(unknown_files)} |",
        f"| **Total** | **{len(files)}** |",
        "",
    ]

    # ------------------------------------------------------------------
    # Nebulosa files
    # ------------------------------------------------------------------
    lines += [
        "## 🌌 Nebulosa Files",
        "",
        "These files implement the Nebulosa Zoom automation platform and "
        "**should remain** in this repository.",
        "",
    ]
    if nebulosa_files:
        for f in sorted(nebulosa_files, key=lambda x: x.path):
            lang_tag = f" `{f.language}`" if f.language else ""
            lines.append(f"- {file_link(f)}{lang_tag}")
    else:
        lines.append("_No Nebulosa-specific files detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # StixMagic files
    # ------------------------------------------------------------------
    lines += [
        "## ✨ StixMagic Files",
        "",
        "These files implement the StixMagic Telegram sticker bot and "
        "**should be migrated** to the standalone `FriskyDevelopments/StixMagic` "
        "repository.  See [`STIX_MAGIC_EXTRACTION_GUIDE.md`]"
        f"({repo_url}/blob/{commit_sha}/STIX_MAGIC_EXTRACTION_GUIDE.md) "
        "for step-by-step migration instructions.",
        "",
    ]
    if stixmagic_files:
        for f in sorted(stixmagic_files, key=lambda x: x.path):
            lang_tag = f" `{f.language}`" if f.language else ""
            lines.append(f"- {file_link(f)}{lang_tag}")
    else:
        lines.append("_No StixMagic-specific files detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Shared / Infrastructure files
    # ------------------------------------------------------------------
    lines += [
        "## 🔗 Shared / Infrastructure Files",
        "",
        "These deployment and configuration files are used by both projects. "
        "A copy should be maintained in each repository and adapted to its "
        "specific entry point and service name.",
        "",
    ]
    if shared_files:
        for f in sorted(shared_files, key=lambda x: x.path):
            lines.append(f"- {file_link(f)}")
    else:
        lines.append("_No shared infrastructure files detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Unclassified files
    # ------------------------------------------------------------------
    if unknown_files:
        lines += [
            "## ❓ Unclassified Files",
            "",
            "These files could not be automatically assigned to a project. "
            "Manual review is recommended.",
            "",
        ]
        for f in sorted(unknown_files, key=lambda x: x.path):
            lines.append(f"- {file_link(f)}")
        lines.append("")

    # ------------------------------------------------------------------
    # Separation recommendations
    # ------------------------------------------------------------------
    recommendations = _build_recommendations(
        nebulosa_files, stixmagic_files, shared_files, unknown_files
    )
    lines += [
        "## Separation Recommendations",
        "",
    ]
    for i, rec in enumerate(recommendations, 1):
        lines.append(f"{i}. {rec}")
    lines.append("")

    # ------------------------------------------------------------------
    # Citations
    # ------------------------------------------------------------------
    lines += [
        "## Citations",
        "",
        f"All file links point to commit `{short_sha}` in [{owner}/{repo}]({repo_url}).",
        "",
    ]

    markdown = "\n".join(lines)

    return Report.create(
        task_id=task_id,
        report_type="separation_report",
        markdown_content=markdown,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_recommendations(
    nebulosa: list[RepositoryFile],
    stixmagic: list[RepositoryFile],
    shared: list[RepositoryFile],
    unknown: list[RepositoryFile],
) -> list[str]:
    """Generate prioritised, actionable separation recommendations."""
    recs: list[str] = []

    if stixmagic:
        recs.append(
            f"**Migrate {len(stixmagic)} StixMagic file(s)** to the standalone "
            "`FriskyDevelopments/StixMagic` repository following the "
            "`STIX_MAGIC_EXTRACTION_GUIDE.md` checklist."
        )
        # Check for StixMagic files under top-level service/bot directories
        top_level_dirs = {f.path.split("/")[0] for f in stixmagic if "/" in f.path}
        if top_level_dirs:
            dir_list = ", ".join(f"`{d}/`" for d in sorted(top_level_dirs))
            recs.append(
                f"After migration, **delete the {dir_list} "
                f"{'directories' if len(top_level_dirs) > 1 else 'directory'}** "
                "from this repository to avoid confusion."
            )

    if shared:
        recs.append(
            f"**Copy {len(shared)} shared infrastructure file(s)** "
            "(Dockerfile, railway.json, etc.) to the StixMagic repo and update "
            "any entry-point references from `railway-complete-bot.js` to "
            "`stixmagic-bot.js`."
        )

    if unknown:
        recs.append(
            f"**Manually review {len(unknown)} unclassified file(s)** and assign "
            "them to the correct project before completing the migration."
        )

    if nebulosa and not stixmagic:
        recs.append(
            "No StixMagic files detected – the repository appears to contain "
            "only Nebulosa code.  No separation action is required."
        )

    if not recs:
        recs.append(
            "No actionable separation steps detected.  The repository may "
            "already be well-organized."
        )

    return recs
