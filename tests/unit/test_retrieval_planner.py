"""Unit tests for the retrieval planner."""
import pytest

from apps.worker_agent.src.agent.planners.retrieval_planner import (
    RetrievalTier,
    plan_retrieval,
)
from domain.tasks.entities import TaskType


class TestPlanRetrieval:
    def test_architecture_report_uses_structured_facts(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "produce an architecture report")
        assert RetrievalTier.STRUCTURED_FACTS in plan.tiers

    def test_target_architecture_adds_semantic_tier(self):
        plan = plan_retrieval(TaskType.TARGET_ARCHITECTURE, "design a target system")
        assert RetrievalTier.SEMANTIC_SEARCH in plan.tiers

    def test_live_tier_added_for_recent_keywords(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "what changed in the last 7 days?")
        assert RetrievalTier.LIVE_GITHUB in plan.tiers
        assert plan.need_fresh_data is True

    def test_no_live_tier_for_static_report(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "produce an architecture report")
        assert RetrievalTier.LIVE_GITHUB not in plan.tiers
        assert plan.need_fresh_data is False

    def test_repo_compare_adds_live_tier(self):
        plan = plan_retrieval(TaskType.REPO_COMPARE, "compare repos")
        assert RetrievalTier.LIVE_GITHUB in plan.tiers

    def test_pr_keyword_triggers_live_hint(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "what PRs are blocked?")
        assert "pull_requests" in plan.live_query_hints

    def test_issue_keyword_triggers_live_hint(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "which issues mention auth?")
        assert "issues" in plan.live_query_hints

    def test_focus_keywords_extracted(self):
        plan = plan_retrieval(TaskType.ARCHITECTURE_REPORT, "analyze the auth module")
        assert "analyze" in plan.focus_keywords or "auth" in plan.focus_keywords

    def test_repo_separation_uses_structured_facts(self):
        plan = plan_retrieval(TaskType.REPO_SEPARATION, "separate nebulosa from stixmagic")
        assert RetrievalTier.STRUCTURED_FACTS in plan.tiers

    def test_repo_separation_does_not_add_live_tier_by_default(self):
        plan = plan_retrieval(TaskType.REPO_SEPARATION, "separate nebulosa from stixmagic")
        assert RetrievalTier.LIVE_GITHUB not in plan.tiers
        assert plan.need_fresh_data is False

    def test_repo_separation_focus_keywords_extracted(self):
        plan = plan_retrieval(TaskType.REPO_SEPARATION, "separate nebulosa from stixmagic")
        assert "separate" in plan.focus_keywords or "nebulosa" in plan.focus_keywords
