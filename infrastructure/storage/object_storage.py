"""
Object storage abstraction for repository snapshots, parsed blobs, and reports.

Provides a simple async interface compatible with local filesystem storage
(for development/testing) and cloud object stores (S3/GCS/Azure Blob in
production).
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import BinaryIO, Optional, Union

logger = logging.getLogger(__name__)


class ObjectStorage:
    """
    Filesystem-backed object storage (suitable for local development).

    Production deployments should replace this with an S3-compatible
    backend by subclassing and overriding ``put``, ``get``, and ``delete``.

    Parameters
    ----------
    base_path:
        Root directory for stored objects.
    """

    def __init__(self, base_path: Union[str, Path]) -> None:
        self._base = Path(base_path)
        self._base.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Sanitise key to prevent path traversal
        safe_key = key.lstrip("/").replace("..", "")
        return self._base / safe_key

    async def put(self, key: str, data: bytes, *, content_type: str = "application/octet-stream") -> str:
        """
        Store *data* under *key* and return the key.

        Parameters
        ----------
        key:
            Object key (path-like string).
        data:
            Raw bytes to store.
        content_type:
            MIME type hint (used by cloud backends).

        Returns
        -------
        str
            The object key, usable as a ``content_ref`` in file records.
        """
        dest = self._resolve(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        logger.debug("Stored object: %s (%d bytes)", key, len(data))
        return key

    async def get(self, key: str) -> Optional[bytes]:
        """
        Retrieve an object by key.

        Returns ``None`` if the object does not exist.
        """
        path = self._resolve(key)
        if not path.exists():
            return None
        return path.read_bytes()

    async def delete(self, key: str) -> None:
        """Remove an object."""
        path = self._resolve(key)
        if path.exists():
            path.unlink()
            logger.debug("Deleted object: %s", key)

    async def exists(self, key: str) -> bool:
        return self._resolve(key).exists()

    def make_key(self, *parts: str) -> str:
        """Build a namespaced object key from path parts."""
        return "/".join(str(p).strip("/") for p in parts)
