# 👤 LUCAS: Webhooks API Routes
# Manages webhook subscriptions for n8n and other integrations

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import httpx

from app.database import get_supabase
from app.models.auth import User
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


# ===========================================
# Models
# ===========================================

class WebhookCreate(BaseModel):
    url: str
    event: str  # scan.completed, scan.failed, issue.critical, tracking.event, tracking.preference, *
    site_id: Optional[str] = None  # Optional filter by site
    secret: Optional[str] = None  # Optional secret for signature verification


class Webhook(BaseModel):
    id: str
    url: str
    event: str
    site_id: Optional[str]
    is_active: bool
    created_at: str


class WebhookResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


# ===========================================
# Webhook Management Endpoints
# ===========================================

@router.get("", response_model=WebhookResponse)
async def list_webhooks(current_user: User = Depends(get_current_user)):
    """List all webhooks for the current user."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("webhooks").select(
            "id, url, event, site_id, is_active, created_at"
        ).eq("user_id", current_user.id).eq("is_active", True).execute()
        
        webhooks = [
            Webhook(
                id=str(row["id"]),
                url=row["url"],
                event=row["event"],
                site_id=row.get("site_id"),
                is_active=row["is_active"],
                created_at=row["created_at"],
            )
            for row in (result.data or [])
        ]
        
        return WebhookResponse(
            success=True,
            data={"webhooks": [w.model_dump() for w in webhooks]}
        )
        
    except Exception as e:
        return WebhookResponse(success=False, error=str(e))


@router.post("", response_model=WebhookResponse)
async def create_webhook(
    webhook: WebhookCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new webhook subscription."""
    try:
        supabase = get_supabase()
        
        # Validate event type
        valid_events = [
            "scan.completed", "scan.failed", "issue.critical",
            "tracking.event", "tracking.preference", "*"
        ]
        if webhook.event not in valid_events:
            return WebhookResponse(
                success=False,
                error=f"Invalid event type. Valid types: {', '.join(valid_events)}"
            )
        
        # Create webhook record
        webhook_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "url": webhook.url,
            "event": webhook.event,
            "site_id": webhook.site_id,
            "secret": webhook.secret,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        result = supabase.table("webhooks").insert(webhook_data).execute()
        
        if not result.data:
            return WebhookResponse(success=False, error="Failed to create webhook")
        
        return WebhookResponse(
            success=True,
            data={"id": webhook_data["id"], "url": webhook.url, "event": webhook.event}
        )
        
    except Exception as e:
        return WebhookResponse(success=False, error=str(e))


@router.delete("/{webhook_id}", response_model=WebhookResponse)
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete (deactivate) a webhook."""
    try:
        supabase = get_supabase()
        
        # Verify ownership and deactivate
        result = supabase.table("webhooks").update(
            {"is_active": False}
        ).eq("id", webhook_id).eq("user_id", current_user.id).execute()
        
        if not result.data:
            return WebhookResponse(success=False, error="Webhook not found")
        
        return WebhookResponse(success=True, data={"deleted": webhook_id})
        
    except Exception as e:
        return WebhookResponse(success=False, error=str(e))


# ===========================================
# Webhook Delivery (Internal Use)
# ===========================================

async def deliver_webhook(event_type: str, data: dict, site_id: Optional[str] = None):
    """
    Deliver a webhook event to all matching subscribers.
    Called internally when events occur (scan complete, tracking event, etc.)
    """
    try:
        supabase = get_supabase()
        
        # Find matching webhooks
        query = supabase.table("webhooks").select(
            "id, url, event, secret, user_id"
        ).eq("is_active", True)
        
        # Match specific event or wildcard
        # We need to get all webhooks and filter in code since Supabase doesn't support OR easily
        result = query.execute()
        
        if not result.data:
            return
        
        # Filter matching webhooks
        matching_webhooks = []
        for webhook in result.data:
            # Check event match (specific or wildcard)
            if webhook["event"] != event_type and webhook["event"] != "*":
                continue
            
            # Check site_id filter if present
            webhook_site_id = webhook.get("site_id")
            if webhook_site_id and site_id and webhook_site_id != site_id:
                continue
            
            matching_webhooks.append(webhook)
        
        # Deliver to each matching webhook
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "site_id": site_id,
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for webhook in matching_webhooks:
                try:
                    headers = {"Content-Type": "application/json"}
                    
                    # Add secret header if configured
                    if webhook.get("secret"):
                        headers["X-GhostUI-Secret"] = webhook["secret"]
                    
                    await client.post(
                        webhook["url"],
                        json=payload,
                        headers=headers,
                    )
                except Exception as e:
                    # Log but don't fail - webhook delivery is best-effort
                    print(f"Webhook delivery failed to {webhook['url']}: {e}")
        
    except Exception as e:
        print(f"Webhook delivery error: {e}")


# ===========================================
# Test Endpoint
# ===========================================

@router.post("/test", response_model=WebhookResponse)
async def test_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user)
):
    """Send a test event to a webhook."""
    try:
        supabase = get_supabase()
        
        # Get webhook
        result = supabase.table("webhooks").select(
            "url, secret"
        ).eq("id", webhook_id).eq("user_id", current_user.id).single().execute()
        
        if not result.data:
            return WebhookResponse(success=False, error="Webhook not found")
        
        webhook = result.data
        
        # Send test payload
        payload = {
            "event": "test",
            "data": {"message": "This is a test webhook from Ghost-UI"},
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        headers = {"Content-Type": "application/json"}
        if webhook.get("secret"):
            headers["X-GhostUI-Secret"] = webhook["secret"]
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook["url"], json=payload, headers=headers)
        
        return WebhookResponse(
            success=True,
            data={
                "status_code": response.status_code,
                "delivered": response.status_code < 400,
            }
        )
        
    except Exception as e:
        return WebhookResponse(success=False, error=str(e))
