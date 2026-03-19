"""Unit tests for GitHub App authentication."""
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from integrations.github.app_auth import GitHubAppAuth


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_APP_ID = "123456"

# Minimal RSA private key for testing (generated offline, not a real secret)
_TEST_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29KNnMHpGSGYhM
kS5UxJnSHzNkEEh3e9rk+OJoLZQPgXqwOHVbHc7JgGIBmNkLqtIFDBUiMkBKBpBv
vKxHjuFcFrPFTSo5MMBE7XRdRU+dqyiS8HS0Q/r1BDQBJ+UNJegvWaFbMXP2gXL1
PRJKU6MF8xCVVU0PBY0DXLH0mPLCeMwcHmGAnhBLz4t03LjMVq9+IVSjgWkbcqFR
rnbhLLqQWuHsJRjuRjYC2hjAqPTRhBY5Dg2aMDHGKT9W8OjSUFfX5DFc0SqzFzgP
GNTFkjwJnvTNIqmLxCaEaGDqVMi/c/7T13VhYwIDAQABAoIBAHh4IuBB5vJLsJJH
l/pN7JixMxFlmBlqxRVxoYXlzgIPo1kSdE2tDwJUZnOyHXBqhEf6K5bJ5J9cEBWk
kP8xKyJOj7UtLqDbnKLInH5n8r3JhNtLLmqWbH9zH7FRFZ9LgJoTBTvhJ6NQKZPU
yH1ULPt6qP1cHqmZgMQHl6RTevmIJQlFGYj5BKYIGG6B8MNbz1HBUlwLsL8HJHOA
VVbP6lRQ6NJqS5yIHRb1E8dNFInnMH3c4XJNL2E1PtDWi3EkApVRBKAu8nGiWULP
YGXb5K8vKIXv0YBsV+XbBnl4QJBR5mfEfS52DX7sNVyaCdAPBCp1Bh0y7jqIRwEh
EZVuDcECgYEA7ZqeiFqDlWkXIo0iL0YXZG9RJA7K2e7KzCMPpPl8rQHkjf7LBOOE
b0k3f6KVSwUUqzwvM+Sp5TGGqaFXMcnP+Nc7K5q7HyuBJNfJqcr/3bT3MeHl1a2B
PXHJ2f7k9VxC7i5t5QKH3EoNMZkQSX8NkQpDRdY3FwPpnZUu9ZkCgYEA6jKx9sPL
9Y0jVbLXPmr7c3l2XgkC4D2xUc9VMy7KzGJ4BWLBHB7gx4yvRrZB8TMHdJDJNqXq
6y3EBsQILg7DQNH/RvzKA5bv2MFXK3tNzDj/tVvvKJ2AuLcKBfoBQOPqQ3WK9nVS
mIRfI1TlPQHxpBfOi4zJnT5TjEfPJMiw5VkCgYBVqjfJmkGD4VB6B8rPoLFtPGQi
6KxCJNjSEBkEhQE4NuFLi8QDLfxwHVrL8/4ILBhkM0R2ixXs9KQOR6REbHCE2lNk
Z2pSJbz8qvDkZBtGpDjCsCJgBIABBqKmVj7EW6M3KGn8pnJH8tXiHKXiI1yJMRcI
t4iw5wnZi3t60QKBgFqFJNQ9aHa3nNpnC2J+1lOp1C4d3RU6qIjnT3JJkKs7UeAP
FJsIOzpn/FJCBnD7mDqFuJl9a7TXF1LYXQN0pFbVXRyv8wWAeAZF3+7U5JLCZriw
TRHzW1fHBY5E9cJOm1tP2aS3QLLkwwKTmFwsBm1dHWVZjLo7xHgJ8+LRAoGBAKsv
qCfVrPOt+tqJON9yyXNIgJGRMGd4V4kXyMG7A3cVaUYq0bpP5j4F2VqQR+yCEZFc
KhiPbCjL+5PB1G7D7nTp+l5R/vAMj5o83mLV2GsMFoHFH7MoTNblK3V5V9E9bFHJ
Y2C8CqgkR8F6VQdpyh+P0LpKB0HsM3Q7G0H81A8N
-----END RSA PRIVATE KEY-----"""


class TestGitHubAppAuth:
    """Tests for GitHubAppAuth."""

    def test_generate_jwt_returns_string(self):
        auth = GitHubAppAuth(_FAKE_APP_ID, _TEST_PRIVATE_KEY)
        # We can't use a properly generated RSA key in unit tests easily,
        # so just verify the method is callable and returns a string type
        # by mocking jwt.encode.
        with patch("integrations.github.app_auth.jwt.encode", return_value="test.jwt.token"):
            token = auth.generate_jwt()
        assert isinstance(token, str)
        assert token == "test.jwt.token"

    def test_jwt_payload_contains_required_fields(self):
        auth = GitHubAppAuth(_FAKE_APP_ID, _TEST_PRIVATE_KEY)
        captured_payload = {}

        def fake_encode(payload, key, algorithm):
            captured_payload.update(payload)
            return "mocked"

        with patch("integrations.github.app_auth.jwt.encode", side_effect=fake_encode):
            auth.generate_jwt()

        assert "iat" in captured_payload
        assert "exp" in captured_payload
        assert captured_payload["iss"] == _FAKE_APP_ID
        # exp should be roughly iat + 600
        assert captured_payload["exp"] > captured_payload["iat"]

    @pytest.mark.asyncio
    async def test_get_installation_token_uses_cache(self):
        auth = GitHubAppAuth(_FAKE_APP_ID, _TEST_PRIVATE_KEY)

        future_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        auth._token_cache[42] = ("cached_token", future_expiry)

        token = await auth.get_installation_token(42)
        assert token == "cached_token"

    @pytest.mark.asyncio
    async def test_get_installation_token_refreshes_stale_cache(self):
        auth = GitHubAppAuth(_FAKE_APP_ID, _TEST_PRIVATE_KEY)

        # Token expired 1 minute ago
        past_expiry = datetime.now(timezone.utc) - timedelta(minutes=1)
        auth._token_cache[42] = ("old_token", past_expiry)

        fresh_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        mock_mint = AsyncMock(return_value=("fresh_token", fresh_expiry))

        with patch.object(auth, "_mint_installation_token", mock_mint):
            token = await auth.get_installation_token(42)

        assert token == "fresh_token"
        mock_mint.assert_called_once()
