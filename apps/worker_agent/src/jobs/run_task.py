"""
Task runner job.

Loads a task by ID, resolves the agent, executes it, and persists the report.
This is the entry point for the worker-agent Celery task.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from apps.worker_agent.src.agent.orchestrator import AgentOrchestrator
from domain.tasks.entities import Task

logger = logging.getLogger(__name__)


async def run_task(
    *,
    task: Task,
    fact_store: Any,
    file_store: Any,
    snapshot_store: Any,
    repository_store: Any,
    report_store: Any,
    rest_client: Any = None,
    graphql_client: Any = None,
) -> None:
    """
    Execute an architecture analysis task and persist the resulting report.

    Parameters
    ----------
    task:
        Task entity to execute.
    fact_store / file_store / snapshot_store / repository_store / report_store:
        Data access objects injected by the worker.
    rest_client / graphql_client:
        Optional live GitHub API clients.
    """
    logger.info(
        "Running task %s (type=%s, repo=%s)",
        task.id,
        task.task_type,
        task.repository_id,
    )

    orchestrator = AgentOrchestrator(
        fact_store=fact_store,
        file_store=file_store,
        snapshot_store=snapshot_store,
        repository_store=repository_store,
        rest_client=rest_client,
        graphql_client=graphql_client,
    )

    report = await orchestrator.run_task(task)
    await report_store.save_report(report)

    logger.info(
        "Task %s completed → report %s (%d chars)",
        task.id,
        report.id,
        len(report.markdown_content),
    )
