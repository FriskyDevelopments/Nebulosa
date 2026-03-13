"""Unit tests for architecture report generation."""
import uuid
from decimal import Decimal

import pytest

from apps.worker_agent.src.agent.report_generators.architecture_report import (
    generate_architecture_report,
)
from domain.architecture.entities import ArchitectureFact, FactType
from domain.reports.entities import Report
from domain.scans.entities import FileType, RepositoryFile


def _make_fact(snapshot_id, fact_type, subject, source_file_id=None, confidence=0.9):
    return ArchitectureFact.create(
        snapshot_id,
        fact_type,
        subject,
        source_file_id=source_file_id,
        confidence=confidence,
    )


def _make_file(snapshot_id, path, language=None):
    return RepositoryFile.create(
        snapshot_id,
        path,
        FileType.CODE,
        "abc123",
        language=language,
    )


class TestGenerateArchitectureReport:
    def _build_report(self, facts=None, files=None):
        task_id = uuid.uuid4()
        snapshot_id = uuid.uuid4()
        return generate_architecture_report(
            task_id=task_id,
            owner="acme",
            repo="my-service",
            commit_sha="abc1234567890",
            facts=facts or [],
            files=files or [],
        )

    def test_returns_report_object(self):
        report = self._build_report()
        assert isinstance(report, Report)

    def test_report_contains_repo_name(self):
        report = self._build_report()
        assert "acme/my-service" in report.markdown_content

    def test_report_contains_commit_sha(self):
        report = self._build_report()
        assert "abc12345" in report.markdown_content  # short_sha

    def test_framework_appears_in_summary(self):
        snapshot_id = uuid.uuid4()
        facts = [_make_fact(snapshot_id, FactType.FRAMEWORK, "FastAPI")]
        report = self._build_report(facts=facts)
        assert "FastAPI" in report.markdown_content

    def test_database_appears_in_report(self):
        snapshot_id = uuid.uuid4()
        facts = [_make_fact(snapshot_id, FactType.DATABASE, "PostgreSQL")]
        report = self._build_report(facts=facts)
        assert "PostgreSQL" in report.markdown_content

    def test_language_table_rendered(self):
        snapshot_id = uuid.uuid4()
        files = [
            _make_file(snapshot_id, "a.py", language="Python"),
            _make_file(snapshot_id, "b.py", language="Python"),
            _make_file(snapshot_id, "c.ts", language="TypeScript"),
        ]
        report = self._build_report(files=files)
        assert "Python" in report.markdown_content
        assert "TypeScript" in report.markdown_content

    def test_no_entrypoint_triggers_issue(self):
        report = self._build_report()
        assert "entrypoint" in report.markdown_content.lower()

    def test_no_tests_triggers_issue(self):
        snapshot_id = uuid.uuid4()
        files = [_make_file(snapshot_id, "src/main.py", language="Python")]
        report = self._build_report(files=files)
        assert "test" in report.markdown_content.lower()

    def test_file_link_included_when_source_file_provided(self):
        snapshot_id = uuid.uuid4()
        file = _make_file(snapshot_id, "src/app.py", language="Python")
        fact = _make_fact(
            snapshot_id, FactType.FRAMEWORK, "FastAPI", source_file_id=file.id
        )
        report = self._build_report(facts=[fact], files=[file])
        assert "src/app.py" in report.markdown_content

    def test_report_type_is_correct(self):
        report = self._build_report()
        assert report.report_type == "architecture_report"

    def test_empty_facts_no_crash(self):
        report = self._build_report(facts=[], files=[])
        assert len(report.markdown_content) > 0
