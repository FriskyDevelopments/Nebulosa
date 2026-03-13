"""Unit tests for domain entities."""
import uuid
from datetime import datetime

import pytest

from domain.architecture.entities import ArchitectureFact, CodeChunk, FactType
from domain.repositories.entities import GitHubInstallation, Repository
from domain.reports.entities import AuditLog, Report, WebhookEvent
from domain.scans.entities import FileType, RepositoryFile, RepositorySnapshot, SnapshotStatus
from domain.tasks.entities import Task, TaskStatus, TaskType


class TestGitHubInstallation:
    def test_create(self):
        inst = GitHubInstallation.create(
            github_installation_id=12345,
            account_login="acme",
            account_type="Organization",
        )
        assert inst.github_installation_id == 12345
        assert inst.account_login == "acme"
        assert inst.account_type == "Organization"
        assert isinstance(inst.id, uuid.UUID)
        assert isinstance(inst.created_at, datetime)


class TestRepository:
    def test_create(self):
        install_id = uuid.uuid4()
        repo = Repository.create(
            installation_id=install_id,
            github_repo_id=99,
            owner="acme",
            name="my-service",
            default_branch="main",
            is_private=True,
        )
        assert repo.owner == "acme"
        assert repo.name == "my-service"
        assert repo.full_name == "acme/my-service"
        assert repo.is_private is True
        assert repo.active is True

    def test_full_name(self):
        install_id = uuid.uuid4()
        repo = Repository.create(install_id, 1, "org", "repo")
        assert repo.full_name == "org/repo"


class TestRepositorySnapshot:
    def test_create_is_queued(self):
        snap = RepositorySnapshot.create(uuid.uuid4(), "abc123")
        assert snap.snapshot_status == SnapshotStatus.QUEUED
        assert snap.file_count is None

    def test_mark_running(self):
        snap = RepositorySnapshot.create(uuid.uuid4(), "abc123")
        snap.mark_running()
        assert snap.snapshot_status == SnapshotStatus.RUNNING

    def test_mark_complete(self):
        snap = RepositorySnapshot.create(uuid.uuid4(), "abc123")
        snap.mark_running()
        snap.mark_complete(42)
        assert snap.snapshot_status == SnapshotStatus.COMPLETE
        assert snap.file_count == 42
        assert snap.completed_at is not None

    def test_mark_failed(self):
        snap = RepositorySnapshot.create(uuid.uuid4(), "abc123")
        snap.mark_failed()
        assert snap.snapshot_status == SnapshotStatus.FAILED
        assert snap.completed_at is not None


class TestRepositoryFile:
    def test_create(self):
        rf = RepositoryFile.create(
            uuid.uuid4(), "src/main.py", FileType.CODE, "sha256abc",
            language="Python", size_bytes=1024
        )
        assert rf.path == "src/main.py"
        assert rf.file_type == FileType.CODE
        assert rf.language == "Python"
        assert rf.size_bytes == 1024


class TestArchitectureFact:
    def test_create(self):
        fact = ArchitectureFact.create(
            uuid.uuid4(), FactType.FRAMEWORK, "FastAPI", confidence=0.95
        )
        assert fact.subject == "FastAPI"
        assert fact.fact_type == FactType.FRAMEWORK
        assert float(fact.confidence) == pytest.approx(0.95)

    def test_create_with_source_file(self):
        file_id = uuid.uuid4()
        fact = ArchitectureFact.create(
            uuid.uuid4(), FactType.DATABASE, "PostgreSQL",
            source_file_id=file_id
        )
        assert fact.source_file_id == file_id


class TestTask:
    def test_create_is_queued(self):
        task = Task.create(
            repository_id=uuid.uuid4(),
            task_type=TaskType.ARCHITECTURE_REPORT,
            prompt="Analyze this repo",
            requested_by="user123",
        )
        assert task.status == TaskStatus.QUEUED
        assert task.completed_at is None

    def test_lifecycle(self):
        task = Task.create(
            repository_id=uuid.uuid4(),
            task_type=TaskType.ROADMAP,
            prompt="Generate a roadmap",
            requested_by="user123",
        )
        task.mark_running()
        assert task.status == TaskStatus.RUNNING
        task.mark_completed()
        assert task.status == TaskStatus.COMPLETED
        assert task.completed_at is not None

    def test_mark_failed(self):
        task = Task.create(
            repository_id=uuid.uuid4(),
            task_type=TaskType.API_DESIGN,
            prompt="Design APIs",
            requested_by="user123",
        )
        task.mark_failed()
        assert task.status == TaskStatus.FAILED


class TestReport:
    def test_create(self):
        report = Report.create(
            task_id=uuid.uuid4(),
            report_type="architecture_report",
            markdown_content="# Report\n\nContent here.",
        )
        assert report.report_type == "architecture_report"
        assert "# Report" in report.markdown_content
        assert report.artifact_ref is None


class TestAuditLog:
    def test_create(self):
        log = AuditLog.create(
            actor="system",
            action="scan_completed",
            entity_type="repository_snapshot",
            entity_id=uuid.uuid4(),
            metadata={"files": 123},
        )
        assert log.actor == "system"
        assert log.action == "scan_completed"
        assert log.metadata["files"] == 123
