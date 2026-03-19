"""Domain entities for architecture facts and code chunks."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Optional


class FactType(str, Enum):
    SERVICE = "service"
    DATABASE = "db"
    API = "api"
    QUEUE = "queue"
    FRAMEWORK = "framework"
    ENTRYPOINT = "entrypoint"
    INTEGRATION = "integration"
    DEPLOYMENT = "deployment"
    CONFIG = "config"
    AUTH = "auth"


@dataclass
class ArchitectureFact:
    """
    A single extracted architecture fact about a repository snapshot.

    Facts are typed (e.g. ``framework``, ``entrypoint``, ``db``) and linked
    to the source file from which they were extracted, along with a
    confidence score in the range [0.0, 1.0].
    """

    id: uuid.UUID
    snapshot_id: uuid.UUID
    fact_type: FactType
    subject: str                       # e.g. "FastAPI", "PostgreSQL"
    object: Optional[str]              # e.g. "main.py depends on FastAPI"
    attributes: dict
    source_file_id: Optional[uuid.UUID]
    confidence: Decimal                # 0.0000 – 1.0000

    @classmethod
    def create(
        cls,
        snapshot_id: uuid.UUID,
        fact_type: FactType,
        subject: str,
        *,
        object_: Optional[str] = None,
        attributes: Optional[dict] = None,
        source_file_id: Optional[uuid.UUID] = None,
        confidence: float = 1.0,
    ) -> "ArchitectureFact":
        return cls(
            id=uuid.uuid4(),
            snapshot_id=snapshot_id,
            fact_type=fact_type,
            subject=subject,
            object=object_,
            attributes=attributes or {},
            source_file_id=source_file_id,
            confidence=Decimal(str(round(confidence, 4))),
        )


@dataclass
class CodeChunk:
    """
    A text chunk extracted from a source file for semantic retrieval.

    Large files are split into chunks of roughly ``max_tokens`` each.
    An optional embedding reference points to a stored vector in the
    vector index.
    """

    id: uuid.UUID
    file_id: uuid.UUID
    chunk_index: int
    text_content: str
    embedding_ref: Optional[str]
    tokens: Optional[int]

    @classmethod
    def create(
        cls,
        file_id: uuid.UUID,
        chunk_index: int,
        text_content: str,
        *,
        embedding_ref: Optional[str] = None,
        tokens: Optional[int] = None,
    ) -> "CodeChunk":
        return cls(
            id=uuid.uuid4(),
            file_id=file_id,
            chunk_index=chunk_index,
            text_content=text_content,
            embedding_ref=embedding_ref,
            tokens=tokens,
        )
