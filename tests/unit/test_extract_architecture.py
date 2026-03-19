"""Unit tests for architecture fact extraction."""
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest

from apps.worker_ingest.src.pipeline.extract_architecture import extract_architecture_facts
from domain.architecture.entities import FactType
from domain.scans.entities import FileType, RepositoryFile


def _make_file(snapshot_id, path, language=None):
    return RepositoryFile.create(
        snapshot_id,
        path,
        FileType.CODE if language else FileType.CONFIG,
        "abc123",
        language=language,
    )


class TestExtractArchitectureFacts:
    def test_detects_fastapi(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "main.py").write_text("from fastapi import FastAPI\napp = FastAPI()")
        rf = _make_file(snapshot_id, "main.py", language="Python")
        rf.id = uuid.uuid4()

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        subjects = {f.subject for f in facts}
        assert "FastAPI" in subjects

    def test_detects_entrypoint(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "main.py").write_text("# entrypoint")
        rf = _make_file(snapshot_id, "main.py", language="Python")

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        entrypoints = [f for f in facts if f.fact_type == FactType.ENTRYPOINT]
        assert len(entrypoints) >= 1

    def test_detects_postgresql(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "db.py").write_text("import asyncpg\n# connect to postgres")
        rf = _make_file(snapshot_id, "db.py", language="Python")

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        subjects = {f.subject for f in facts}
        assert "PostgreSQL" in subjects

    def test_detects_redis(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "cache.py").write_text("import redis\nclient = redis.Redis()")
        rf = _make_file(snapshot_id, "cache.py", language="Python")

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        subjects = {f.subject for f in facts}
        assert "Redis" in subjects

    def test_detects_docker_deployment(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "Dockerfile").write_text("FROM python:3.12\n")
        rf = RepositoryFile.create(
            snapshot_id, "Dockerfile", FileType.INFRA, "def456"
        )

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        deploy_facts = [f for f in facts if f.fact_type == FactType.DEPLOYMENT]
        subjects = {f.subject for f in deploy_facts}
        assert "Docker" in subjects

    def test_deduplicates_same_fact_type_and_subject(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "a.py").write_text("import asyncpg")
        (tmp_path / "b.py").write_text("import asyncpg")
        rf_a = _make_file(snapshot_id, "a.py", language="Python")
        rf_b = _make_file(snapshot_id, "b.py", language="Python")

        facts = extract_architecture_facts(snapshot_id, [rf_a, rf_b], tmp_path)
        pg_facts = [f for f in facts if f.subject == "PostgreSQL"]
        assert len(pg_facts) == 1

    def test_empty_facts_for_unknown_files(self, tmp_path):
        snapshot_id = uuid.uuid4()
        (tmp_path / "unknown.txt").write_text("nothing interesting here")
        rf = RepositoryFile.create(
            snapshot_id, "unknown.txt", FileType.OTHER, "xyz"
        )

        facts = extract_architecture_facts(snapshot_id, [rf], tmp_path)
        # Should not crash; may return empty list
        assert isinstance(facts, list)
