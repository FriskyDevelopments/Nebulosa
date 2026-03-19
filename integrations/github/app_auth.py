"""
GitHub App authentication module.

Handles:
- GitHub App JWT token generation
- Installation access token minting
- Token caching and refresh
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import jwt


class GitHubAppAuth:
    """Generates GitHub App JWTs and mints installation access tokens."""

    _AUDIENCE = "https://api.github.com"
    _JWT_EXPIRY_SECONDS = 600  # GitHub maximum is 10 minutes

    def __init__(self, app_id: str, private_key_pem: str) -> None:
        self._app_id = app_id
        self._private_key = private_key_pem
        # Cache: installation_id -> (token, expires_at)
        self._token_cache: dict[int, tuple[str, datetime]] = {}

    # ------------------------------------------------------------------
    # JWT generation
    # ------------------------------------------------------------------

    def generate_jwt(self) -> str:
        """Return a signed JWT for authenticating as the GitHub App."""
        now = int(time.time())
        payload = {
            "iat": now - 60,  # issued-at with 60 s skew allowance
            "exp": now + self._JWT_EXPIRY_SECONDS,
            "iss": self._app_id,
        }
        return jwt.encode(payload, self._private_key, algorithm="RS256")

    # ------------------------------------------------------------------
    # Installation token
    # ------------------------------------------------------------------

    async def get_installation_token(
        self,
        installation_id: int,
        *,
        repositories: Optional[list[str]] = None,
        permissions: Optional[dict[str, str]] = None,
    ) -> str:
        """
        Return a cached installation access token, minting a fresh one when needed.

        Args:
            installation_id: GitHub App installation ID.
            repositories: Optional list of repository names to restrict the token.
            permissions: Optional permission overrides for the token.

        Returns:
            A valid installation access token string.
        """
        cached = self._token_cache.get(installation_id)
        if cached:
            token, expires_at = cached
            # Treat tokens within 60 s of expiry as stale
            if expires_at > datetime.now(timezone.utc) + timedelta(seconds=60):
                return token

        token, expires_at = await self._mint_installation_token(
            installation_id,
            repositories=repositories,
            permissions=permissions,
        )
        self._token_cache[installation_id] = (token, expires_at)
        return token

    async def _mint_installation_token(
        self,
        installation_id: int,
        *,
        repositories: Optional[list[str]] = None,
        permissions: Optional[dict[str, str]] = None,
    ) -> tuple[str, datetime]:
        app_jwt = self.generate_jwt()
        url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
        body: dict = {}
        if repositories:
            body["repositories"] = repositories
        if permissions:
            body["permissions"] = permissions

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {app_jwt}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                timeout=30,
            )
            response.raise_for_status()

        data = response.json()
        token: str = data["token"]
        expires_at = datetime.fromisoformat(
            data["expires_at"].replace("Z", "+00:00")
        )
        return token, expires_at

    # ------------------------------------------------------------------
    # App-level installation list
    # ------------------------------------------------------------------

    async def list_installations(self) -> list[dict]:
        """Return all installations of this GitHub App."""
        app_jwt = self.generate_jwt()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/app/installations",
                headers={
                    "Authorization": f"Bearer {app_jwt}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                timeout=30,
            )
            response.raise_for_status()
        return response.json()
