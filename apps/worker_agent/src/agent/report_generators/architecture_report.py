"""
Architecture report generator.

Produces a structured Markdown report from a set of ``ArchitectureFact``
records and file-level metadata.  The report follows a standard template
with sections for:

  - Executive summary
  - Languages & frameworks
  - Entry points
  - Data persistence
  - Message queues & integrations
  - Deployment & infrastructure
  - Identified architecture issues
  - Citations (linked to GitHub file URLs)
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from domain.architecture.entities import ArchitectureFact, FactType
from domain.reports.entities import Report
from domain.scans.entities import RepositoryFile


def generate_architecture_report(
    *,
    task_id: uuid.UUID,
    owner: str,
    repo: str,
    commit_sha: str,
    facts: list[ArchitectureFact],
    files: list[RepositoryFile],
    github_base_url: str = "https://github.com",
) -> Report:
    """
    Build a ``Report`` from extracted architecture facts.

    Parameters
    ----------
    task_id:
        The task this report belongs to.
    owner / repo:
        GitHub repository coordinates used for citation links.
    commit_sha:
        The snapshot commit SHA (used in file permalink links).
    facts:
        Architecture facts extracted during ingestion.
    files:
        File records from the snapshot (used for context).
    github_base_url:
        Base URL for GitHub file permalinks.

    Returns
    -------
    Report
        Structured report entity with Markdown content.
    """
    by_type: dict[FactType, list[ArchitectureFact]] = defaultdict(list)
    for fact in facts:
        by_type[fact.fact_type].append(fact)

    file_map = {f.id: f for f in files}
    short_sha = commit_sha[:8]
    repo_url = f"{github_base_url}/{owner}/{repo}"

    def file_link(file_id: Optional[uuid.UUID]) -> str:
        if file_id and file_id in file_map:
            path = file_map[file_id].path
            return f"[`{path}`]({repo_url}/blob/{commit_sha}/{path})"
        return ""

    lines: list[str] = []

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------
    lines += [
        f"# Architecture Report: {owner}/{repo}",
        "",
        f"> **Snapshot:** `{short_sha}` — Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]

    # ------------------------------------------------------------------
    # Executive Summary
    # ------------------------------------------------------------------
    framework_names = [f.subject for f in by_type.get(FactType.FRAMEWORK, [])]
    db_names = [f.subject for f in by_type.get(FactType.DATABASE, [])]
    queue_names = [f.subject for f in by_type.get(FactType.QUEUE, [])]

    lines += [
        "## Executive Summary",
        "",
    ]
    if framework_names:
        lines.append(
            f"The repository uses **{', '.join(framework_names)}** as its primary "
            f"framework{'s' if len(framework_names) > 1 else ''}."
        )
    if db_names:
        lines.append(
            f"Data persistence is handled by **{', '.join(db_names)}**."
        )
    if queue_names:
        lines.append(
            f"Asynchronous messaging uses **{', '.join(queue_names)}**."
        )
    if not facts:
        lines.append(
            "_No architecture facts could be automatically extracted.  "
            "Consider adding manifest files or dependency declarations._"
        )
    lines.append("")

    # ------------------------------------------------------------------
    # Languages & Frameworks
    # ------------------------------------------------------------------
    lines += ["## Languages & Frameworks", ""]
    lang_counter: dict[str, int] = defaultdict(int)
    for f in files:
        if f.language:
            lang_counter[f.language] += 1

    if lang_counter:
        lines.append("| Language | Files |")
        lines.append("|----------|-------|")
        for lang, count in sorted(lang_counter.items(), key=lambda x: -x[1]):
            lines.append(f"| {lang} | {count} |")
        lines.append("")

    for fact in by_type.get(FactType.FRAMEWORK, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- **{fact.subject}** {src}")
    lines.append("")

    # ------------------------------------------------------------------
    # Entry Points
    # ------------------------------------------------------------------
    lines += ["## Entry Points", ""]
    for fact in by_type.get(FactType.ENTRYPOINT, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- {src or fact.subject}")
    if not by_type.get(FactType.ENTRYPOINT):
        lines.append("_No entry points detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Data Persistence
    # ------------------------------------------------------------------
    lines += ["## Data Persistence", ""]
    for fact in by_type.get(FactType.DATABASE, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- **{fact.subject}** {src}")
    if not by_type.get(FactType.DATABASE):
        lines.append("_No database dependencies detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Message Queues & Integrations
    # ------------------------------------------------------------------
    lines += ["## Message Queues & Integrations", ""]
    for fact in by_type.get(FactType.QUEUE, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- **{fact.subject}** {src}")
    for fact in by_type.get(FactType.INTEGRATION, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- **{fact.subject}** {src}")
    if not (by_type.get(FactType.QUEUE) or by_type.get(FactType.INTEGRATION)):
        lines.append("_No queues or external integrations detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Deployment & Infrastructure
    # ------------------------------------------------------------------
    lines += ["## Deployment & Infrastructure", ""]
    for fact in by_type.get(FactType.DEPLOYMENT, []):
        src = file_link(fact.source_file_id)
        lines.append(f"- **{fact.subject}** {src}")
    if not by_type.get(FactType.DEPLOYMENT):
        lines.append("_No deployment artifacts detected._")
    lines.append("")

    # ------------------------------------------------------------------
    # Architecture Issues / Observations
    # ------------------------------------------------------------------
    issues: list[str] = _identify_issues(by_type, files)
    lines += ["## Architecture Issues & Observations", ""]
    if issues:
        for issue in issues:
            lines.append(f"- ⚠️ {issue}")
    else:
        lines.append("_No obvious architectural issues detected by automated analysis._")
    lines.append("")

    # ------------------------------------------------------------------
    # Citations
    # ------------------------------------------------------------------
    lines += ["## Citations", ""]
    lines.append(
        f"All file links point to commit `{short_sha}` in [{owner}/{repo}]({repo_url})."
    )
    lines.append("")

    markdown = "\n".join(lines)

    return Report.create(
        task_id=task_id,
        report_type="architecture_report",
        markdown_content=markdown,
    )


def _identify_issues(
    by_type: dict[FactType, list[ArchitectureFact]],
    files: list[RepositoryFile],
) -> list[str]:
    """Apply simple heuristics to surface potential architecture issues."""
    issues: list[str] = []

    # Multiple database systems detected – possible over-complexity
    db_facts = by_type.get(FactType.DATABASE, [])
    if len(db_facts) > 3:
        names = ", ".join(f.subject for f in db_facts)
        issues.append(
            f"Multiple database systems detected ({names}).  "
            "Evaluate whether all are actively used."
        )

    # No entrypoints found
    if not by_type.get(FactType.ENTRYPOINT):
        issues.append(
            "No well-known entrypoint files detected.  The repository structure "
            "may be unconventional or primarily a library."
        )

    # No tests directory
    has_tests = any(
        "test" in f.path.lower() or "spec" in f.path.lower() for f in files
    )
    if not has_tests:
        issues.append("No test files detected.  Consider adding automated tests.")

    # No CI/CD workflows
    has_ci = any("/.github/workflows/" in f.path for f in files)
    if not has_ci:
        issues.append(
            "No GitHub Actions workflow files found.  "
            "Consider adding CI/CD automation."
        )

    return issues
