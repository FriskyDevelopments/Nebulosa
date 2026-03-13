"""Domain entities for generated architecture reports."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Report:
    """A structured architecture report produced by the agent."""

    id: uuid.UUID
    task_id: uuid.UUID
    report_type: str           # matches TaskType value
    markdown_content: str
    artifact_ref: Optional[str]  # Object storage key for downloadable artifact
    created_at: datetime

    @classmethod
    def create(
        cls,
        task_id: uuid.UUID,
        report_type: str,
        markdown_content: str,
        *,
        artifact_ref: Optional[str] = None,
    ) -> "Report":
        return cls(
            id=uuid.uuid4(),
            task_id=task_id,
            report_type=report_type,
            markdown_content=markdown_content,
            artifact_ref=artifact_ref,
            created_at=datetime.now(timezone.utc),
        )


@dataclass
class WebhookEvent:
    """A stored inbound GitHub webhook event."""

    id: uuid.UUID
    installation_id: Optional[uuid.UUID]
    event_name: str
    delivery_id: str
    payload: dict
    received_at: datetime

    @classmethod
    def create(
        cls,
        event_name: str,
        delivery_id: str,
        payload: dict,
        *,
        installation_id: Optional[uuid.UUID] = None,
    ) -> "WebhookEvent":
        return cls(
            id=uuid.uuid4(),
            installation_id=installation_id,
            event_name=event_name,
            delivery_id=delivery_id,
            payload=payload,
            received_at=datetime.now(timezone.utc),
        )


@dataclass
class AuditLog:
    """An immutable audit record for a system action."""

    id: uuid.UUID
    actor: str
    action: str
    entity_type: str
    entity_id: Optional[uuid.UUID]
    metadata: dict
    created_at: datetime

    @classmethod
    def create(
        cls,
        actor: str,
        action: str,
        entity_type: str,
        *,
        entity_id: Optional[uuid.UUID] = None,
        metadata: Optional[dict] = None,
    ) -> "AuditLog":
        return cls(
            id=uuid.uuid4(),
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
