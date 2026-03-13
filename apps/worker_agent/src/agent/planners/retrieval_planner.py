"""
Retrieval planner for the architecture agent.

Determines which data sources to query – structured facts, code chunks,
or live GitHub REST/GraphQL queries – based on the task type and the
content of the user's prompt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from domain.tasks.entities import TaskType


class RetrievalTier(str, Enum):
    """The three-tier retrieval strategy."""

    STRUCTURED_FACTS = "structured_facts"   # Tier 1
    SEMANTIC_SEARCH = "semantic_search"     # Tier 2
    LIVE_GITHUB = "live_github"             # Tier 3


@dataclass
class RetrievalPlan:
    """The resolved retrieval plan for a given task."""

    tiers: list[RetrievalTier]
    need_fresh_data: bool
    focus_keywords: list[str]
    file_path_hints: list[str]
    live_query_hints: list[str]


_LIVE_DATA_PATTERNS: list[re.Pattern] = [
    re.compile(r"\blast\s+\d+\s+days?\b", re.I),
    re.compile(r"\brecent(ly)?\b", re.I),
    re.compile(r"\bpr(s)?\b|\bpull\s+request\b", re.I),
    re.compile(r"\bissue(s)?\b", re.I),
    re.compile(r"\bblocked\b", re.I),
    re.compile(r"\bchanges?\b", re.I),
]

# Task types that typically only need structured facts
_STRUCTURED_ONLY: frozenset[TaskType] = frozenset(
    {
        TaskType.ARCHITECTURE_REPORT,
        TaskType.ARCHITECTURE_PROBLEMS,
        TaskType.FOLDER_STRUCTURE,
    }
)

# Task types that benefit from semantic search
_NEEDS_SEMANTIC: frozenset[TaskType] = frozenset(
    {
        TaskType.TARGET_ARCHITECTURE,
        TaskType.SERVICE_BOUNDARIES,
        TaskType.DATABASE_DESIGN,
        TaskType.API_DESIGN,
        TaskType.DEPLOYMENT_DESIGN,
        TaskType.ROADMAP,
    }
)


def plan_retrieval(task_type: TaskType, prompt: str) -> RetrievalPlan:
    """
    Determine which retrieval tiers are needed to answer this task.

    Parameters
    ----------
    task_type:
        The type of architecture task.
    prompt:
        The user-provided task prompt.

    Returns
    -------
    RetrievalPlan
        Resolved plan with ordered tiers and query hints.
    """
    tiers: list[RetrievalTier] = [RetrievalTier.STRUCTURED_FACTS]

    if task_type in _NEEDS_SEMANTIC:
        tiers.append(RetrievalTier.SEMANTIC_SEARCH)

    need_fresh = any(p.search(prompt) for p in _LIVE_DATA_PATTERNS)
    if need_fresh or task_type == TaskType.REPO_COMPARE:
        tiers.append(RetrievalTier.LIVE_GITHUB)

    focus_keywords = _extract_keywords(prompt)
    file_path_hints = _extract_path_hints(prompt)
    live_query_hints = _build_live_query_hints(prompt) if need_fresh else []

    return RetrievalPlan(
        tiers=tiers,
        need_fresh_data=need_fresh,
        focus_keywords=focus_keywords,
        file_path_hints=file_path_hints,
        live_query_hints=live_query_hints,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STOPWORDS = frozenset(
    {
        "a", "an", "the", "and", "or", "in", "of", "for", "to", "with",
        "this", "that", "is", "are", "was", "be", "has", "have", "how",
        "what", "where", "when", "which", "do", "does", "can", "could",
        "should", "would", "will",
    }
)


def _extract_keywords(prompt: str) -> list[str]:
    tokens = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_-]{2,}\b", prompt)
    return [t.lower() for t in tokens if t.lower() not in _STOPWORDS][:20]


def _extract_path_hints(prompt: str) -> list[str]:
    """Look for file/path references in the prompt (e.g. src/, api.py)."""
    return re.findall(r"[\w/-]+\.(?:py|js|ts|go|rb|java|rs|sql|yaml|yml|tf)\b", prompt)


def _build_live_query_hints(prompt: str) -> list[str]:
    hints = []
    if re.search(r"\bprs?\b|\bpull\s+requests?\b", prompt, re.I):
        hints.append("pull_requests")
    if re.search(r"\bissues?\b", prompt, re.I):
        hints.append("issues")
    if re.search(r"\bcommit\b|\bpush\b", prompt, re.I):
        hints.append("commits")
    return hints
