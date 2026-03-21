"""Unit tests for the repository separation report generator."""
import uuid

import pytest

from apps.worker_agent.src.agent.report_generators.separation_report import (
    generate_separation_report,
)
from domain.reports.entities import Report
from domain.scans.entities import FileType, RepositoryFile


def _make_file(snapshot_id: uuid.UUID, path: str, language: str = None) -> RepositoryFile:
    return RepositoryFile.create(
        snapshot_id,
        path,
        FileType.CODE if language else FileType.CONFIG,
        "deadbeef",
        language=language,
    )


class TestGenerateSeparationReport:
    def _build_report(self, files=None):
        task_id = uuid.uuid4()
        return generate_separation_report(
            task_id=task_id,
            owner="FriskyDevelopments",
            repo="Nebulosa",
            commit_sha="abc1234567890",
            files=files or [],
        )

    def test_returns_report_object(self):
        report = self._build_report()
        assert isinstance(report, Report)

    def test_report_type_is_separation_report(self):
        report = self._build_report()
        assert report.report_type == "separation_report"

    def test_report_contains_repo_name(self):
        report = self._build_report()
        assert "FriskyDevelopments/Nebulosa" in report.markdown_content

    def test_report_contains_commit_sha(self):
        report = self._build_report()
        assert "abc12345" in report.markdown_content  # short_sha

    def test_stixmagic_file_appears_in_stixmagic_section(self):
        snapshot_id = uuid.uuid4()
        files = [_make_file(snapshot_id, "bot/index.js", language="JavaScript")]
        report = self._build_report(files=files)
        assert "bot/index.js" in report.markdown_content
        assert "StixMagic" in report.markdown_content

    def test_nebulosa_file_appears_in_nebulosa_section(self):
        snapshot_id = uuid.uuid4()
        files = [_make_file(snapshot_id, "server/routes.ts", language="TypeScript")]
        report = self._build_report(files=files)
        assert "server/routes.ts" in report.markdown_content
        assert "Nebulosa" in report.markdown_content

    def test_dockerfile_appears_in_shared_section(self):
        snapshot_id = uuid.uuid4()
        files = [_make_file(snapshot_id, "Dockerfile")]
        report = self._build_report(files=files)
        assert "Dockerfile" in report.markdown_content
        assert "Shared" in report.markdown_content

    def test_summary_table_present(self):
        report = self._build_report()
        assert "Summary" in report.markdown_content
        assert "Nebulosa-only" in report.markdown_content
        assert "StixMagic-only" in report.markdown_content

    def test_recommendations_section_present(self):
        report = self._build_report()
        assert "Recommendation" in report.markdown_content

    def test_migration_recommendation_when_stixmagic_files_exist(self):
        snapshot_id = uuid.uuid4()
        files = [
            _make_file(snapshot_id, "bot/index.js", language="JavaScript"),
            _make_file(snapshot_id, "services/stickerService.js", language="JavaScript"),
        ]
        report = self._build_report(files=files)
        assert "Migrate" in report.markdown_content or "migrate" in report.markdown_content

    def test_delete_recommendation_includes_top_level_dirs(self):
        snapshot_id = uuid.uuid4()
        files = [
            _make_file(snapshot_id, "bot/index.js", language="JavaScript"),
            _make_file(snapshot_id, "services/stickerService.js", language="JavaScript"),
        ]
        report = self._build_report(files=files)
        # Should recommend deleting `bot/` and/or `services/`
        content = report.markdown_content
        assert "`bot/`" in content or "`services/`" in content

    def test_no_crash_on_empty_files(self):
        report = self._build_report(files=[])
        assert len(report.markdown_content) > 0

    def test_counts_in_summary_are_correct(self):
        snapshot_id = uuid.uuid4()
        files = [
            _make_file(snapshot_id, "bot/index.js", language="JavaScript"),
            _make_file(snapshot_id, "server/routes.ts", language="TypeScript"),
            _make_file(snapshot_id, "Dockerfile"),
        ]
        report = self._build_report(files=files)
        # Each category should show count of 1
        assert "| 🌌 Nebulosa-only | 1 |" in report.markdown_content
        assert "| ✨ StixMagic-only | 1 |" in report.markdown_content
        assert "| 🔗 Shared / Infrastructure | 1 |" in report.markdown_content

    def test_mixed_language_files_present(self):
        snapshot_id = uuid.uuid4()
        files = [
            _make_file(snapshot_id, "apps/worker_ingest/src/pipeline/classify_files.py", language="Python"),
            _make_file(snapshot_id, "stixmagic/bot/bot.ts", language="TypeScript"),
        ]
        report = self._build_report(files=files)
        assert "Python" in report.markdown_content or "classify_files.py" in report.markdown_content
        assert "TypeScript" in report.markdown_content or "bot.ts" in report.markdown_content

    def test_citations_section_present(self):
        report = self._build_report()
        assert "Citations" in report.markdown_content

    def test_extraction_guide_link_in_stixmagic_section(self):
        snapshot_id = uuid.uuid4()
        files = [_make_file(snapshot_id, "bot/index.js", language="JavaScript")]
        report = self._build_report(files=files)
        assert "STIX_MAGIC_EXTRACTION_GUIDE" in report.markdown_content
