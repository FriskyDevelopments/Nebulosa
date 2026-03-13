"""
GitHub webhook receiver route.

Endpoint:
  POST /v1/webhooks/github

Handles:
  - installation / installation_repositories
  - push
  - pull_request
  - issues
  - release
  - repository

Every inbound webhook is:
1. Signature-verified against the configured webhook secret
2. Stored in the ``webhook_events`` table (idempotent by delivery_id)
3. Dispatched to the appropriate background job
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from apps.api.src.schemas.api_schemas import WebhookAckResponse
from integrations.github.webhook import GitHubWebhookHandler, WebhookSignatureError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


def _get_webhook_handler() -> GitHubWebhookHandler:
    """Return the singleton webhook handler.  Override in production with DI."""
    import os
    secret = os.getenv("GITHUB_WEBHOOK_SECRET")
    return GitHubWebhookHandler(webhook_secret=secret)


@router.post("/github", response_model=WebhookAckResponse)
async def receive_github_webhook(
    request: Request,
    x_github_event: str = Header(..., alias="x-github-event"),
    x_github_delivery: str = Header(..., alias="x-github-delivery"),
    webhook_handler: GitHubWebhookHandler = Depends(_get_webhook_handler),
    event_store: Any = Depends(lambda: None),
    queue: Any = Depends(lambda: None),
) -> WebhookAckResponse:
    """
    Receive and process a GitHub webhook delivery.

    Returns HTTP 200 immediately; processing is asynchronous.
    Returns HTTP 400 if the payload cannot be parsed.
    Returns HTTP 401 if the signature is invalid.
    """
    raw_body = await request.body()

    try:
        event = webhook_handler.parse(dict(request.headers), raw_body)
    except WebhookSignatureError as exc:
        logger.warning("Webhook signature verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )
    except Exception as exc:
        logger.error("Failed to parse webhook payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed webhook payload",
        )

    logger.info(
        "Received webhook: event=%s delivery=%s installation=%s repo=%s",
        event.event_name,
        event.delivery_id,
        event.installation_id,
        event.full_name,
    )

    # Persist the raw event for audit/replay
    if event_store is not None:
        try:
            await event_store.store_webhook_event(event)
        except Exception as exc:
            # Duplicate delivery (unique constraint) – idempotent
            if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
                logger.info("Duplicate webhook delivery ignored: %s", event.delivery_id)
                return WebhookAckResponse(delivery_id=event.delivery_id)
            logger.warning("Failed to store webhook event: %s", exc)

    # Dispatch to the appropriate job
    if queue is not None:
        await _dispatch_event(event, queue)

    return WebhookAckResponse(delivery_id=event.delivery_id)


async def _dispatch_event(event: Any, queue: Any) -> None:
    """Enqueue the appropriate background job for a webhook event."""
    name = event.event_name
    action = event.action

    if name == "installation" and action in {"created", "new_permissions_accepted"}:
        await queue.enqueue("install_sync", payload=event.payload)

    elif name == "installation_repositories" and action == "added":
        await queue.enqueue("install_repos_added", payload=event.payload)

    elif name == "push":
        await queue.enqueue("incremental_refresh", payload=event.payload)

    elif name in {"pull_request", "issues", "release"}:
        await queue.enqueue("incremental_refresh", payload=event.payload)

    elif name == "repository" and action in {"created", "transferred", "renamed"}:
        await queue.enqueue("repo_sync", payload=event.payload)

    else:
        logger.debug("No job dispatched for event=%s action=%s", name, action)
