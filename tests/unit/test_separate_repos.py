"""Unit tests for the repository separation classifier."""
import pytest

from apps.worker_ingest.src.pipeline.separate_repos import (
    RepoOwner,
    classify_ownership,
    classify_ownership_bulk,
)


class TestClassifyOwnershipByPath:
    # ---- StixMagic paths ----

    def test_stixmagic_bot_entrypoint(self):
        assert classify_ownership("stixmagic-bot.js") == RepoOwner.STIX_MAGIC

    def test_stixmagic_directory(self):
        assert classify_ownership("stixmagic/bot/bot.ts") == RepoOwner.STIX_MAGIC

    def test_bot_index(self):
        assert classify_ownership("bot/index.js") == RepoOwner.STIX_MAGIC

    def test_bot_handler(self):
        assert classify_ownership("bot/handlers/stickerHandler.js") == RepoOwner.STIX_MAGIC

    def test_bot_magic_center(self):
        assert classify_ownership("bot/magicCenter.js") == RepoOwner.STIX_MAGIC

    def test_sticker_service(self):
        assert classify_ownership("services/stickerService.js") == RepoOwner.STIX_MAGIC

    def test_draft_service(self):
        assert classify_ownership("services/draftService.js") == RepoOwner.STIX_MAGIC

    def test_usage_service(self):
        assert classify_ownership("services/usageService.js") == RepoOwner.STIX_MAGIC

    def test_cleanup_service(self):
        assert classify_ownership("services/cleanupService.js") == RepoOwner.STIX_MAGIC

    def test_cleanup_worker(self):
        assert classify_ownership("workers/cleanupWorker.js") == RepoOwner.STIX_MAGIC

    def test_models_storage(self):
        assert classify_ownership("models/storage.js") == RepoOwner.STIX_MAGIC

    def test_config_limits(self):
        assert classify_ownership("config/limits.js") == RepoOwner.STIX_MAGIC

    # ---- Nebulosa paths ----

    def test_server_directory(self):
        assert classify_ownership("server/routes.ts") == RepoOwner.NEBULOSA

    def test_shared_schema(self):
        assert classify_ownership("shared/schema.ts") == RepoOwner.NEBULOSA

    def test_zoom_file(self):
        assert classify_ownership("scripts/puppeteer-joinZoom.js") == RepoOwner.NEBULOSA

    def test_oauth_server(self):
        assert classify_ownership("oauth-server.js") == RepoOwner.NEBULOSA

    def test_domain_entities(self):
        assert classify_ownership("domain/tasks/entities.py") == RepoOwner.NEBULOSA

    def test_apps_api(self):
        assert classify_ownership("apps/api/src/main.py") == RepoOwner.NEBULOSA

    def test_apps_worker_ingest(self):
        assert classify_ownership("apps/worker_ingest/src/pipeline/classify_files.py") == RepoOwner.NEBULOSA

    def test_apps_worker_agent(self):
        assert classify_ownership("apps/worker_agent/src/agent/orchestrator.py") == RepoOwner.NEBULOSA

    def test_integrations_github(self):
        assert classify_ownership("integrations/github/app_auth.py") == RepoOwner.NEBULOSA

    def test_tests_directory(self):
        assert classify_ownership("tests/unit/test_classify_files.py") == RepoOwner.NEBULOSA

    def test_infrastructure_directory(self):
        assert classify_ownership("infrastructure/db/models/user.py") == RepoOwner.NEBULOSA

    def test_contracts_directory(self):
        assert classify_ownership("contracts/api/openapi.json") == RepoOwner.NEBULOSA

    # ---- Shared / infrastructure paths ----

    def test_dockerfile(self):
        assert classify_ownership("Dockerfile") == RepoOwner.SHARED

    def test_github_workflow(self):
        assert classify_ownership(".github/workflows/node.js.yml") == RepoOwner.SHARED

    def test_railway_json(self):
        assert classify_ownership("railway.json") == RepoOwner.SHARED

    def test_package_json(self):
        assert classify_ownership("package.json") == RepoOwner.SHARED

    def test_env_example(self):
        assert classify_ownership(".env.example") == RepoOwner.SHARED

    def test_readme(self):
        assert classify_ownership("README.md") == RepoOwner.SHARED

    def test_gitignore(self):
        assert classify_ownership(".gitignore") == RepoOwner.SHARED


class TestClassifyOwnershipByContent:
    def test_stixmagic_content_signal_wins(self):
        content = "const { sendMagicCenter } = require('./magicCenter');"
        result = classify_ownership("unknown.js", content)
        assert result == RepoOwner.STIX_MAGIC

    def test_nebulosa_content_signal_wins(self):
        content = "from fastapi import FastAPI\napp = FastAPI()"
        result = classify_ownership("app.py", content)
        assert result == RepoOwner.NEBULOSA

    def test_more_nebulosa_signals_wins(self):
        content = "GitHubAppAuth nebulosa RepositorySnapshot"
        result = classify_ownership("helper.py", content)
        assert result == RepoOwner.NEBULOSA

    def test_more_stixmagic_signals_wins(self):
        content = "stickerHandler draftHandler magicCenter stixmagic"
        result = classify_ownership("glue.js", content)
        assert result == RepoOwner.STIX_MAGIC

    def test_no_signals_returns_unknown(self):
        content = "const x = 1; console.log(x);"
        result = classify_ownership("misc.js", content)
        assert result == RepoOwner.UNKNOWN

    def test_no_content_returns_unknown_for_ambiguous_path(self):
        result = classify_ownership("src/helper.js")
        assert result == RepoOwner.UNKNOWN


class TestClassifyOwnershipBulk:
    def test_classifies_multiple_paths(self):
        paths = [
            "bot/index.js",
            "server/routes.ts",
            "Dockerfile",
        ]
        result = classify_ownership_bulk(paths)
        assert result["bot/index.js"] == RepoOwner.STIX_MAGIC
        assert result["server/routes.ts"] == RepoOwner.NEBULOSA
        assert result["Dockerfile"] == RepoOwner.SHARED

    def test_uses_content_when_provided(self):
        paths = ["ambiguous.js"]
        contents = {"ambiguous.js": "stixmagic magicCenter stickerHandler"}
        result = classify_ownership_bulk(paths, contents=contents)
        assert result["ambiguous.js"] == RepoOwner.STIX_MAGIC

    def test_empty_paths_returns_empty_dict(self):
        result = classify_ownership_bulk([])
        assert result == {}

    def test_all_paths_present_in_output(self):
        paths = ["a.py", "b.js", "c.ts"]
        result = classify_ownership_bulk(paths)
        assert set(result.keys()) == set(paths)
