"""
Architecture extraction pipeline stage.

Scans classified repository files and extracts structured ``ArchitectureFact``
records.  Extraction is heuristic – it looks for well-known file names,
import patterns, and manifest contents to identify frameworks, entrypoints,
databases, queues, and integrations.
"""
from __future__ import annotations

import hashlib
import logging
import re
import uuid
from pathlib import Path, PurePosixPath
from typing import Optional

from domain.architecture.entities import ArchitectureFact, FactType
from domain.scans.entities import RepositoryFile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Heuristic rules
# ---------------------------------------------------------------------------

# (pattern, fact_type, subject, confidence)
_FRAMEWORK_SIGNALS: list[tuple[re.Pattern, FactType, str, float]] = [
    # Python
    (re.compile(r"fastapi", re.I), FactType.FRAMEWORK, "FastAPI", 0.9),
    (re.compile(r"from flask|import flask", re.I), FactType.FRAMEWORK, "Flask", 0.9),
    (re.compile(r"from django|import django", re.I), FactType.FRAMEWORK, "Django", 0.9),
    (re.compile(r"from starlette", re.I), FactType.FRAMEWORK, "Starlette", 0.8),
    # JavaScript / TypeScript
    (re.compile(r'"express"', re.I), FactType.FRAMEWORK, "Express", 0.9),
    (re.compile(r'"next"', re.I), FactType.FRAMEWORK, "Next.js", 0.9),
    (re.compile(r'"react"', re.I), FactType.FRAMEWORK, "React", 0.9),
    (re.compile(r'"vue"', re.I), FactType.FRAMEWORK, "Vue.js", 0.9),
    (re.compile(r'"@nestjs/core"', re.I), FactType.FRAMEWORK, "NestJS", 0.9),
    # JVM
    (re.compile(r"spring-boot", re.I), FactType.FRAMEWORK, "Spring Boot", 0.9),
    (re.compile(r"io\.ktor", re.I), FactType.FRAMEWORK, "Ktor", 0.9),
]

_DB_SIGNALS: list[tuple[re.Pattern, FactType, str, float]] = [
    (re.compile(r"postgres|postgresql|psycopg|asyncpg", re.I), FactType.DATABASE, "PostgreSQL", 0.9),
    (re.compile(r"mysql|mariadb|pymysql", re.I), FactType.DATABASE, "MySQL", 0.9),
    (re.compile(r"mongodb|pymongo|mongoose", re.I), FactType.DATABASE, "MongoDB", 0.9),
    (re.compile(r"redis", re.I), FactType.DATABASE, "Redis", 0.8),
    (re.compile(r"sqlite", re.I), FactType.DATABASE, "SQLite", 0.9),
    (re.compile(r"elasticsearch|opensearch", re.I), FactType.DATABASE, "Elasticsearch", 0.8),
    (re.compile(r"dynamodb", re.I), FactType.DATABASE, "DynamoDB", 0.9),
    (re.compile(r"cassandra", re.I), FactType.DATABASE, "Cassandra", 0.9),
]

_QUEUE_SIGNALS: list[tuple[re.Pattern, FactType, str, float]] = [
    (re.compile(r"celery", re.I), FactType.QUEUE, "Celery", 0.9),
    (re.compile(r"rabbitmq|pika|kombu", re.I), FactType.QUEUE, "RabbitMQ", 0.9),
    (re.compile(r"kafka|confluent", re.I), FactType.QUEUE, "Kafka", 0.9),
    (re.compile(r"sqs|boto3.*sqs", re.I), FactType.QUEUE, "AWS SQS", 0.8),
    (re.compile(r"pubsub|google.cloud.pubsub", re.I), FactType.QUEUE, "GCP Pub/Sub", 0.8),
    (re.compile(r"bull|bullmq", re.I), FactType.QUEUE, "BullMQ", 0.9),
]

_ENTRYPOINT_NAMES: frozenset[str] = frozenset(
    {
        "main.py",
        "app.py",
        "server.py",
        "wsgi.py",
        "asgi.py",
        "manage.py",
        "index.js",
        "index.ts",
        "server.js",
        "server.ts",
        "main.go",
        "cmd/main.go",
        "src/main.rs",
        "Application.java",
        "Main.java",
    }
)

_DEPLOYMENT_FILES: dict[str, str] = {
    "dockerfile": "Docker",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    "kubernetes": "Kubernetes",
    "helm": "Helm",
    "terraform": "Terraform",
    ".github/workflows": "GitHub Actions",
    "render.yaml": "Render",
    "railway.json": "Railway",
    "heroku.yml": "Heroku",
    "app.yaml": "Google App Engine",
    "serverless.yml": "Serverless Framework",
}


# ---------------------------------------------------------------------------
# Extraction logic
# ---------------------------------------------------------------------------


def extract_architecture_facts(
    snapshot_id: uuid.UUID,
    repo_files: list[RepositoryFile],
    repo_path: Path,
) -> list[ArchitectureFact]:
    """
    Analyse local repository files and return a list of architecture facts.

    Parameters
    ----------
    snapshot_id:
        The snapshot these facts belong to.
    repo_files:
        Files registered for this snapshot.
    repo_path:
        Local path to the cloned repository root.

    Returns
    -------
    list[ArchitectureFact]
        Extracted facts (may be empty for unrecognised repositories).
    """
    facts: list[ArchitectureFact] = []
    file_map = {f.path: f for f in repo_files}

    for repo_file in repo_files:
        path = repo_file.path
        pure = PurePosixPath(path)
        name_lower = pure.name.lower()
        local_file = repo_path / path

        # ---- Entrypoints ----
        if pure.name in _ENTRYPOINT_NAMES or name_lower in _ENTRYPOINT_NAMES:
            facts.append(
                ArchitectureFact.create(
                    snapshot_id,
                    FactType.ENTRYPOINT,
                    pure.name,
                    object_=path,
                    source_file_id=repo_file.id,
                    confidence=0.9,
                )
            )

        # ---- Deployment artifacts ----
        for key, label in _DEPLOYMENT_FILES.items():
            if key in path.lower():
                facts.append(
                    ArchitectureFact.create(
                        snapshot_id,
                        FactType.DEPLOYMENT,
                        label,
                        object_=path,
                        source_file_id=repo_file.id,
                        confidence=0.95,
                    )
                )
                break

        # ---- Content-based signals ----
        if local_file.exists() and local_file.is_file():
            try:
                content = local_file.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            for pattern, fact_type, subject, conf in (
                _FRAMEWORK_SIGNALS + _DB_SIGNALS + _QUEUE_SIGNALS
            ):
                if pattern.search(content):
                    facts.append(
                        ArchitectureFact.create(
                            snapshot_id,
                            fact_type,
                            subject,
                            object_=path,
                            source_file_id=repo_file.id,
                            confidence=conf,
                        )
                    )

    # Deduplicate by (fact_type, subject) keeping highest-confidence fact
    seen: dict[tuple, ArchitectureFact] = {}
    for fact in facts:
        key = (fact.fact_type, fact.subject)
        if key not in seen or fact.confidence > seen[key].confidence:
            seen[key] = fact

    return list(seen.values())
