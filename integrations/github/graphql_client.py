"""
GitHub GraphQL client with point-budget tracking.

Uses GraphQL for efficient shaped retrieval of nested repository data
(file trees, PR details, issue lists, etc.), reducing REST round-trips.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

_GRAPHQL_URL = "https://api.github.com/graphql"
_GITHUB_API_VERSION = "2022-11-28"


class GraphQLError(Exception):
    """Raised when the GitHub GraphQL response contains errors."""

    def __init__(self, errors: list[dict]) -> None:
        messages = "; ".join(e.get("message", str(e)) for e in errors)
        super().__init__(f"GraphQL errors: {messages}")
        self.errors = errors


class GitHubGraphQLClient:
    """
    Async GitHub GraphQL client.

    Parameters
    ----------
    token_provider:
        An async callable ``() -> str`` returning a valid access token.
    """

    def __init__(self, token_provider: Any) -> None:
        self._token_provider = token_provider
        self._http = httpx.AsyncClient(timeout=60)
        self._points_used: int = 0
        self._points_remaining: int = 5000

    # ------------------------------------------------------------------
    # Core query helper
    # ------------------------------------------------------------------

    async def _headers(self) -> dict[str, str]:
        token = await self._token_provider()
        return {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": _GITHUB_API_VERSION,
            "Content-Type": "application/json",
        }

    @retry(
        retry=retry_if_exception_type(httpx.TransportError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def query(
        self,
        query_string: str,
        *,
        variables: Optional[dict] = None,
    ) -> dict:
        """
        Execute a GraphQL query and return the ``data`` portion of the response.

        Raises
        ------
        GraphQLError
            When the response contains GraphQL-level errors.
        httpx.HTTPStatusError
            For HTTP-level errors.
        """
        body: dict[str, Any] = {"query": query_string}
        if variables:
            body["variables"] = variables

        headers = await self._headers()
        response = await self._http.post(_GRAPHQL_URL, json=body, headers=headers)
        response.raise_for_status()

        # Track rate-limit point consumption
        remaining = response.headers.get("x-ratelimit-remaining")
        if remaining is not None:
            self._points_remaining = int(remaining)

        payload = response.json()
        if "errors" in payload:
            raise GraphQLError(payload["errors"])

        return payload.get("data", {})

    # ------------------------------------------------------------------
    # Repository queries
    # ------------------------------------------------------------------

    async def get_repository_info(self, owner: str, name: str) -> dict:
        """Return basic repository metadata and default branch info."""
        result = await self.query(
            """
            query($owner: String!, $name: String!) {
              repository(owner: $owner, name: $name) {
                id
                name
                nameWithOwner
                description
                defaultBranchRef {
                  name
                  target { oid }
                }
                languages(first: 20) {
                  edges {
                    size
                    node { name }
                  }
                }
                repositoryTopics(first: 20) {
                  nodes { topic { name } }
                }
                stargazerCount
                forkCount
                isPrivate
                createdAt
                updatedAt
                diskUsage
              }
            }
            """,
            variables={"owner": owner, "name": name},
        )
        return result.get("repository", {})

    async def get_repository_tree(
        self,
        owner: str,
        name: str,
        expression: str = "HEAD:",
    ) -> list[dict]:
        """
        Return a flat list of file/dir entries for the given tree expression.

        ``expression`` examples: ``"HEAD:"`` (root), ``"main:src/"``
        """
        result = await self.query(
            """
            query($owner: String!, $name: String!, $expression: String!) {
              repository(owner: $owner, name: $name) {
                object(expression: $expression) {
                  ... on Tree {
                    entries {
                      name
                      type
                      mode
                      oid
                      path: name
                    }
                  }
                }
              }
            }
            """,
            variables={"owner": owner, "name": name, "expression": expression},
        )
        obj = (result.get("repository") or {}).get("object") or {}
        return obj.get("entries", [])

    async def get_recent_pull_requests(
        self,
        owner: str,
        name: str,
        *,
        first: int = 20,
        states: Optional[list[str]] = None,
    ) -> list[dict]:
        """Return the most recent pull requests for a repository."""
        states_val = states or ["OPEN", "MERGED"]
        result = await self.query(
            """
            query($owner: String!, $name: String!, $first: Int!, $states: [PullRequestState!]) {
              repository(owner: $owner, name: $name) {
                pullRequests(first: $first, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
                  nodes {
                    number
                    title
                    state
                    baseRefName
                    headRefName
                    createdAt
                    updatedAt
                    author { login }
                    files(first: 10) { nodes { path additions deletions } }
                  }
                }
              }
            }
            """,
            variables={"owner": owner, "name": name, "first": first, "states": states_val},
        )
        return (
            (result.get("repository") or {})
            .get("pullRequests", {})
            .get("nodes", [])
        )

    async def get_recent_issues(
        self,
        owner: str,
        name: str,
        *,
        first: int = 20,
        states: Optional[list[str]] = None,
    ) -> list[dict]:
        """Return the most recent issues for a repository."""
        states_val = states or ["OPEN"]
        result = await self.query(
            """
            query($owner: String!, $name: String!, $first: Int!, $states: [IssueState!]) {
              repository(owner: $owner, name: $name) {
                issues(first: $first, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
                  nodes {
                    number
                    title
                    state
                    createdAt
                    updatedAt
                    author { login }
                    labels(first: 5) { nodes { name } }
                    body
                  }
                }
              }
            }
            """,
            variables={"owner": owner, "name": name, "first": first, "states": states_val},
        )
        return (
            (result.get("repository") or {})
            .get("issues", {})
            .get("nodes", [])
        )

    # ------------------------------------------------------------------
    # Rate limit
    # ------------------------------------------------------------------

    async def get_rate_limit_info(self) -> dict:
        result = await self.query(
            """
            query {
              rateLimit {
                limit
                cost
                remaining
                resetAt
                nodeCount
              }
            }
            """
        )
        return result.get("rateLimit", {})

    async def close(self) -> None:
        await self._http.aclose()
