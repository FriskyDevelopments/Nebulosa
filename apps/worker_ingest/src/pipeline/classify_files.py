"""
File classification pipeline stage.

Determines the ``FileType`` (code, doc, config, infra, asset) for each
path encountered during a repository tree walk.
"""
from __future__ import annotations

import re
from pathlib import PurePosixPath

from domain.scans.entities import FileType

# ---------------------------------------------------------------------------
# Classification rules
# ---------------------------------------------------------------------------

_INFRA_NAMES: frozenset[str] = frozenset(
    {
        "dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "docker-compose.override.yml",
        ".dockerignore",
        "kubernetes",
        "k8s",
        "helm",
        "terraform",
        "terragrunt",
        "ansible",
        "packer",
        "vagrantfile",
        "nginx.conf",
        "caddy",
    }
)

_DOC_EXTENSIONS: frozenset[str] = frozenset(
    {".md", ".rst", ".txt", ".adoc", ".asciidoc", ".wiki", ".pdf", ".html"}
)

_CONFIG_EXTENSIONS: frozenset[str] = frozenset(
    {
        ".json",
        ".yaml",
        ".yml",
        ".toml",
        ".ini",
        ".cfg",
        ".conf",
        ".env",
        ".properties",
        ".xml",
    }
)

_ASSET_EXTENSIONS: frozenset[str] = frozenset(
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".ico",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".mp4",
        ".mp3",
        ".zip",
        ".tar",
        ".gz",
    }
)

_CODE_EXTENSIONS: frozenset[str] = frozenset(
    {
        ".py",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".rb",
        ".go",
        ".rs",
        ".java",
        ".kt",
        ".swift",
        ".c",
        ".cpp",
        ".cs",
        ".php",
        ".scala",
        ".ex",
        ".exs",
        ".hs",
        ".lua",
        ".r",
        ".sh",
        ".bash",
        ".zsh",
        ".ps1",
        ".sql",
        ".graphql",
        ".proto",
    }
)

_INFRA_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(r"(^|/)\.?k8s/"),
    re.compile(r"(^|/)helm/"),
    re.compile(r"(^|/)terraform/"),
    re.compile(r"(^|/)infra/"),
    re.compile(r"(^|/)deploy/"),
    re.compile(r"(^|/)\.github/workflows/"),
    re.compile(r"(^|/)ci/"),
    re.compile(r"\.tf$"),
    re.compile(r"\.hcl$"),
]

_LANGUAGE_MAP: dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript",
    ".tsx": "TypeScript",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".scala": "Scala",
    ".ex": "Elixir",
    ".exs": "Elixir",
    ".hs": "Haskell",
    ".lua": "Lua",
    ".r": "R",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".graphql": "GraphQL",
    ".proto": "Protobuf",
    ".tf": "Terraform",
    ".hcl": "HCL",
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def classify_file(path: str) -> FileType:
    """
    Return the ``FileType`` for a given repository-relative file path.

    Classification order:
    1. Infrastructure (Dockerfile, k8s manifests, Terraform, CI workflows, …)
    2. Documentation (.md, .rst, README, …)
    3. Configuration (.json, .yaml, .env, …)
    4. Asset (images, fonts, binaries, …)
    5. Code (source files)
    6. Other (unrecognised)
    """
    pure = PurePosixPath(path)
    name_lower = pure.name.lower()
    suffix = pure.suffix.lower()
    path_lower = path.lower()

    # 1. Infrastructure
    if name_lower in _INFRA_NAMES:
        return FileType.INFRA
    for pattern in _INFRA_PATH_PATTERNS:
        if pattern.search(path_lower):
            return FileType.INFRA

    # 2. Documentation
    if name_lower in {"readme", "changelog", "contributing", "license", "authors"}:
        return FileType.DOC
    if suffix in _DOC_EXTENSIONS:
        return FileType.DOC

    # 3. Configuration
    if suffix in _CONFIG_EXTENSIONS:
        return FileType.CONFIG

    # 4. Asset
    if suffix in _ASSET_EXTENSIONS:
        return FileType.ASSET

    # 5. Code
    if suffix in _CODE_EXTENSIONS:
        return FileType.CODE

    return FileType.OTHER


def detect_language(path: str) -> str | None:
    """Return the programming language for a file path, or ``None``."""
    suffix = PurePosixPath(path).suffix.lower()
    return _LANGUAGE_MAP.get(suffix)
