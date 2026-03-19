"""Unit tests for the file classification pipeline."""
import pytest

from apps.worker_ingest.src.pipeline.classify_files import classify_file, detect_language
from domain.scans.entities import FileType


class TestClassifyFile:
    def test_python_source(self):
        assert classify_file("src/main.py") == FileType.CODE

    def test_typescript_source(self):
        assert classify_file("client/src/App.tsx") == FileType.CODE

    def test_javascript_source(self):
        assert classify_file("index.js") == FileType.CODE

    def test_markdown_doc(self):
        assert classify_file("README.md") == FileType.DOC

    def test_rst_doc(self):
        assert classify_file("docs/guide.rst") == FileType.DOC

    def test_json_config(self):
        assert classify_file("package.json") == FileType.CONFIG

    def test_yaml_config(self):
        assert classify_file("config/settings.yaml") == FileType.CONFIG

    def test_dockerfile(self):
        assert classify_file("Dockerfile") == FileType.INFRA

    def test_docker_compose(self):
        assert classify_file("docker-compose.yml") == FileType.INFRA

    def test_github_workflow(self):
        assert classify_file(".github/workflows/ci.yml") == FileType.INFRA

    def test_terraform(self):
        assert classify_file("infra/main.tf") == FileType.INFRA

    def test_png_asset(self):
        assert classify_file("public/logo.png") == FileType.ASSET

    def test_unknown_extension(self):
        assert classify_file("somefile.xyz") == FileType.OTHER


class TestDetectLanguage:
    def test_python(self):
        assert detect_language("main.py") == "Python"

    def test_typescript(self):
        assert detect_language("App.tsx") == "TypeScript"

    def test_go(self):
        assert detect_language("server.go") == "Go"

    def test_unknown(self):
        assert detect_language("something.bin") is None

    def test_terraform(self):
        assert detect_language("main.tf") == "Terraform"
