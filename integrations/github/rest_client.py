"""
GitHub REST API client with rate-limit awareness and retry logic.

Handles:
- Authenticated REST requests using an installation token
- Rate-limit header parsing and back-off
- Automatic retry with exponential back-off for transient errors
- Pagination helpers
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Optional
from urllib.parse import urlencode

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.github.com"
_GITHUB_API_VERSION = "2022-11-28"


class RateLimitExceeded(Exception):
    """Raised when a GitHub rate-limit is hit and cannot be retried quickly."""

    def __init__(self, reset_at: float) -> None:
        self.reset_at = reset_at
        super().__init__(f"GitHub rate limit exceeded. Reset at {reset_at}.")


class GitHubRESTClient:
    """
    Async GitHub REST client.

    Parameters
    ----------
    token_provider:
        An async callable ``() -> str`` that returns a valid installation
        access token.  This allows the client to obtain fresh tokens without
        having to be recreated.
    """

    def __init__(self, token_provider: Any) -> None:
        self._token_provider = token_provider
        self._http = httpx.AsyncClient(
            base_url=_BASE_URL,
            timeout=60,
            follow_redirects=True,
        )

    # ------------------------------------------------------------------
    # Core request helper
    # ------------------------------------------------------------------

    async def _headers(self) -> dict[str, str]:
        token = await self._token_provider()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": _GITHUB_API_VERSION,
        }

    @retry(
        retry=retry_if_exception_type(httpx.TransportError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict] = None,
        json: Optional[dict] = None,
    ) -> httpx.Response:
        headers = await self._headers()
        response = await self._http.request(
            method,
            path,
            headers=headers,
            params=params,
            json=json,
        )
        self._handle_rate_limit(response)
        response.raise_for_status()
        return response

    def _handle_rate_limit(self, response: httpx.Response) -> None:
        if response.status_code == 403:
            remaining = response.headers.get("x-ratelimit-remaining", "1")
            reset_at = float(response.headers.get("x-ratelimit-reset", "0"))
            if remaining == "0":
                raise RateLimitExceeded(reset_at)
        if response.status_code == 429:
            reset_at = float(response.headers.get("x-ratelimit-reset", "0"))
            raise RateLimitExceeded(reset_at)

    # ------------------------------------------------------------------
    # Public REST helpers
    # ------------------------------------------------------------------

    async def get(self, path: str, *, params: Optional[dict] = None) -> Any:
        response = await self._request("GET", path, params=params)
        return response.json()

    async def post(self, path: str, *, json: Optional[dict] = None) -> Any:
        response = await self._request("POST", path, json=json)
        return response.json()

    # ------------------------------------------------------------------
    # Pagination
    # ------------------------------------------------------------------

    async def paginate(
        self,
        path: str,
        *,
        params: Optional[dict] = None,
        page_size: int = 100,
    ) -> AsyncIterator[dict]:
        """
        Yield all items from a paginated GitHub REST endpoint.

        Uses ``Link`` header navigation.
        """
        page_params = dict(params or {})
        page_params["per_page"] = page_size
        page_params["page"] = 1

        while True:
            response = await self._request("GET", path, params=page_params)
            items = response.json()
            if not items:
                break
            for item in items:
                yield item
            # Check Link header for next page
            link_header = response.headers.get("link", "")
            if 'rel="next"' not in link_header:
                break
            page_params["page"] += 1

    # ------------------------------------------------------------------
    # Repository helpers
    # ------------------------------------------------------------------

    async def get_repository(self, owner: str, repo: str) -> dict:
        return await self.get(f"/repos/{owner}/{repo}")

    async def get_repo_tree(
        self, owner: str, repo: str, tree_sha: str, *, recursive: bool = True
    ) -> dict:
        params = {"recursive": "1"} if recursive else {}
        return await self.get(
            f"/repos/{owner}/{repo}/git/trees/{tree_sha}", params=params
        )

    async def get_file_content(
        self, owner: str, repo: str, path: str, *, ref: Optional[str] = None
    ) -> dict:
        params = {"ref": ref} if ref else {}
        return await self.get(
            f"/repos/{owner}/{repo}/contents/{path}", params=params
        )

    async def get_commits(
        self,
        owner: str,
        repo: str,
        *,
        sha: Optional[str] = None,
        since: Optional[str] = None,
        page_size: int = 100,
    ) -> AsyncIterator[dict]:
        params: dict = {"per_page": page_size}
        if sha:
            params["sha"] = sha
        if since:
            params["since"] = since
        async for commit in self.paginate(
            f"/repos/{owner}/{repo}/commits", params=params, page_size=page_size
        ):
            yield commit

    async def get_pull_requests(
        self,
        owner: str,
        repo: str,
        *,
        state: str = "open",
        page_size: int = 100,
    ) -> AsyncIterator[dict]:
        params = {"state": state}
        async for pr in self.paginate(
            f"/repos/{owner}/{repo}/pulls", params=params, page_size=page_size
        ):
            yield pr

    async def get_issues(
        self,
        owner: str,
        repo: str,
        *,
        state: str = "open",
        page_size: int = 100,
    ) -> AsyncIterator[dict]:
        params = {"state": state}
        async for issue in self.paginate(
            f"/repos/{owner}/{repo}/issues", params=params, page_size=page_size
        ):
            yield issue

    async def get_rate_limits(self) -> dict:
        return await self.get("/rate_limit")

    async def close(self) -> None:
        await self._http.aclose()
