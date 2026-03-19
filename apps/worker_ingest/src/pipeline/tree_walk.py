"""
Repository tree walker.

Walks the local working tree of a cloned repository and yields
``(path, size_bytes)`` tuples for every regular file, skipping
common junk directories (.git, node_modules, __pycache__, …).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

# Directories that are always skipped
_SKIP_DIRS: frozenset[str] = frozenset(
    {
        ".git",
        "node_modules",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".tox",
        "venv",
        ".venv",
        "env",
        ".env",
        "dist",
        "build",
        ".next",
        ".nuxt",
        "coverage",
        ".coverage",
        "htmlcoverage",
        ".eggs",
        "*.egg-info",
        ".gradle",
        "target",          # Maven / Cargo build
        "vendor",          # Go / PHP
        ".bundle",
    }
)

# Maximum file size to include (5 MB – larger files are typically binary)
_MAX_FILE_SIZE = 5 * 1024 * 1024


def walk_tree(repo_path: Path) -> Iterator[tuple[str, int]]:
    """
    Yield ``(relative_path, size_bytes)`` for every file in *repo_path*.

    Parameters
    ----------
    repo_path:
        Absolute path to the root of the checked-out repository.

    Yields
    ------
    tuple[str, int]
        POSIX-style path relative to *repo_path*, and file size in bytes.
    """
    root = str(repo_path)
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skipped directories in-place so os.walk doesn't recurse
        dirnames[:] = [
            d for d in dirnames if d not in _SKIP_DIRS and not d.startswith(".")
        ]

        for filename in filenames:
            abs_path = os.path.join(dirpath, filename)
            try:
                size = os.path.getsize(abs_path)
            except OSError:
                continue

            if size > _MAX_FILE_SIZE:
                continue

            relative = os.path.relpath(abs_path, root).replace(os.sep, "/")
            yield relative, size
