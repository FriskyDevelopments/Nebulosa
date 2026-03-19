"""
Architecture Agent Orchestrator.

Interprets a user task, selects the appropriate snapshot, plans retrieval,
executes it, and produces a structured report.  This is the central
coordinator for all agent-driven architecture analysis.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from apps.worker_agent.src.agent.planners.retrieval_planner import (
    RetrievalTier,
    plan_retrieval,
)
from apps.worker_agent.src.agent.report_generators.architecture_report import (
    generate_architecture_report,
)
from domain.architecture.entities import ArchitectureFact
from domain.reports.entities import Report
from domain.scans.entities import RepositoryFile, RepositorySnapshot
from domain.tasks.entities import Task, TaskStatus, TaskType

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Coordinates retrieval and report generation for a given task.

    Parameters
    ----------
    fact_store:
        Object with a ``get_facts(snapshot_id)`` async method that returns
        a list of ``ArchitectureFact``.
    file_store:
        Object with a ``get_files(snapshot_id)`` async method.
    snapshot_store:
        Object with a ``get_latest_snapshot(repository_id)`` async method.
    repository_store:
        Object with a ``get_repository(repository_id)`` async method.
    rest_client:
        Optional live GitHub REST client for Tier-3 queries.
    graphql_client:
        Optional live GitHub GraphQL client.
    """

    def __init__(
        self,
        *,
        fact_store: Any,
        file_store: Any,
        snapshot_store: Any,
        repository_store: Any,
        rest_client: Optional[Any] = None,
        graphql_client: Optional[Any] = None,
    ) -> None:
        self._facts = fact_store
        self._files = file_store
        self._snapshots = snapshot_store
        self._repos = repository_store
        self._rest = rest_client
        self._graphql = graphql_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run_task(self, task: Task) -> Report:
        """
        Execute *task* and return a structured ``Report``.

        Updates the task status in-place.
        """
        task.mark_running()
        try:
            report = await self._dispatch(task)
            task.mark_completed()
            return report
        except Exception as exc:
            logger.exception("Task %s failed: %s", task.id, exc)
            task.mark_failed()
            raise

    # ------------------------------------------------------------------
    # Dispatch by task type
    # ------------------------------------------------------------------

    async def _dispatch(self, task: Task) -> Report:
        task_type = task.task_type

        if task_type in {
            TaskType.ARCHITECTURE_REPORT,
            TaskType.ARCHITECTURE_PROBLEMS,
            TaskType.TARGET_ARCHITECTURE,
            TaskType.SERVICE_BOUNDARIES,
            TaskType.FOLDER_STRUCTURE,
            TaskType.DATABASE_DESIGN,
            TaskType.API_DESIGN,
            TaskType.DEPLOYMENT_DESIGN,
            TaskType.ROADMAP,
        }:
            return await self._run_analysis_task(task)

        if task_type == TaskType.REPO_COMPARE:
            return await self._run_analysis_task(task)

        raise ValueError(f"Unsupported task type: {task_type}")

    # ------------------------------------------------------------------
    # Core analysis pipeline
    # ------------------------------------------------------------------

    async def _run_analysis_task(self, task: Task) -> Report:
        # 1. Resolve snapshot
        snapshot = await self._resolve_snapshot(task)
        if snapshot is None:
            return self._empty_report(
                task,
                "No completed repository snapshot is available.  "
                "Please trigger a full scan first.",
            )

        # 2. Plan retrieval
        plan = plan_retrieval(task.task_type, task.prompt)
        logger.info("Retrieval plan for task %s: tiers=%s", task.id, plan.tiers)

        # 3. Load structured facts (Tier 1 – always)
        facts: list[ArchitectureFact] = []
        files: list[RepositoryFile] = []

        if RetrievalTier.STRUCTURED_FACTS in plan.tiers:
            facts = await self._facts.get_facts(snapshot.id)
            files = await self._files.get_files(snapshot.id)

        # 4. Live GitHub queries (Tier 3)
        live_context: dict = {}
        if RetrievalTier.LIVE_GITHUB in plan.tiers and self._rest:
            live_context = await self._fetch_live_context(
                task.repository_id, plan.live_query_hints
            )

        # 5. Generate report
        repo = await self._repos.get_repository(task.repository_id)
        return generate_architecture_report(
            task_id=task.id,
            owner=repo.owner,
            repo=repo.name,
            commit_sha=snapshot.commit_sha,
            facts=facts,
            files=files,
        )

    async def _resolve_snapshot(self, task: Task) -> Optional[RepositorySnapshot]:
        if task.snapshot_id:
            return await self._snapshots.get_snapshot(task.snapshot_id)
        return await self._snapshots.get_latest_snapshot(task.repository_id)

    async def _fetch_live_context(
        self, repository_id: uuid.UUID, hints: list[str]
    ) -> dict:
        """Retrieve live GitHub data for the hints provided."""
        repo = await self._repos.get_repository(repository_id)
        context: dict = {}
        try:
            if "pull_requests" in hints and self._rest:
                prs = []
                async for pr in self._rest.get_pull_requests(
                    repo.owner, repo.name, state="open"
                ):
                    prs.append(pr)
                    if len(prs) >= 10:
                        break
                context["open_prs"] = prs

            if "issues" in hints and self._rest:
                issues = []
                async for issue in self._rest.get_issues(
                    repo.owner, repo.name, state="open"
                ):
                    issues.append(issue)
                    if len(issues) >= 10:
                        break
                context["open_issues"] = issues
        except Exception as exc:
            logger.warning("Live GitHub query failed: %s", exc)
        return context

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _empty_report(self, task: Task, message: str) -> Report:
        from domain.reports.entities import Report

        return Report.create(
            task_id=task.id,
            report_type=task.task_type.value,
            markdown_content=f"# Report\n\n{message}\n",
        )
