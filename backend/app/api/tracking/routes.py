# 👤 JANNIK: Tracking API Routes

from fastapi import APIRouter, HTTPException, Depends, Header, Query, status
from typing import Optional, List
from datetime import datetime, timedelta
from app.database import get_supabase
from app.models.tracking import (
    TrackingEvent, 
    TrackingEventDB,
    Site, 
    SiteCreate, 
    SiteWithSnippet,
    AnalyticsSummary,
    EventsResponse
)
from app.models.auth import User
from app.middleware.auth import get_current_user, get_current_user_optional
from app.config import settings

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


def generate_embed_snippet(site_id: str) -> str:
    """Generate the embed snippet for a site - unified script with tracking + fixes + widget"""
    backend_url = settings.BACKEND_PUBLIC_URL or "https://ghostui.onrender.com"
    return f'''<!-- Ghost-UI: Analytics + Accessibility Fixes + Widget -->
<script src="{backend_url}/ghostui.js?site_id={site_id}" async defer></script>'''


from fastapi.responses import JSONResponse
from fastapi import Request, Response

def cors_response(data: dict, status_code: int = 200) -> JSONResponse:
    """Return a JSON response with CORS headers for any origin"""
    return JSONResponse(
        content=data,
        status_code=status_code,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )

@router.options("/event")
async def track_event_preflight():
    """Handle CORS preflight for tracking endpoint - allow all origins"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )

import json

@router.post("/event")
async def track_event(
    request: Request,
    site_id: str = Query(..., description="Site ID for tracking"),
):
    """
    Record a tracking event from the embed script.
    This endpoint is public (no auth required) but requires a valid site_id.
    Accepts both JSON and text/plain content types for CORS compatibility.
    """
    import uuid
    
    try:
        # Parse body as JSON (works with both application/json and text/plain)
        body = await request.body()
        event = json.loads(body)
        
        # Validate site_id is a valid UUID
        try:
            uuid.UUID(site_id)
        except ValueError:
            # Invalid UUID - return success but don't store (for testing)
            return cors_response({"success": True, "event_id": None, "note": "test mode"})
        
        supabase = get_supabase()
        
        # Try to verify site exists, but don't fail if not found
        try:
            site_result = supabase.table("tracking_sites").select("id").eq("id", site_id).execute()
            if not site_result.data or len(site_result.data) == 0:
                # Site not found - return success but don't store
                return cors_response({"success": True, "event_id": None, "note": "site not found"})
        except Exception:
            # Table might not exist or other error - continue anyway for resilience
            pass
        
        # Insert the event
        event_data = {
            "site_id": site_id,
            "type": event.get("type"),
            "timestamp": event.get("timestamp"),
            "url": event.get("url"),
            "session_id": event.get("session_id"),
            "data": event.get("data") or {},
        }
        
        result = supabase.table("tracking_events").insert(event_data).execute()
        
        event_id = result.data[0]["id"] if result.data else None
        
        # Deliver webhook for accessibility preference changes
        event_type = event.get("type", "")
        if event_type in ("accessibility_preference", "preferences"):
            try:
                from app.api.webhooks.routes import deliver_webhook
                import asyncio
                asyncio.create_task(deliver_webhook("tracking.preference", {
                    "event_id": event_id,
                    "site_id": site_id,
                    "preference": event.get("data", {}).get("preference") or event.get("preference"),
                    "enabled": event.get("data", {}).get("enabled") or event.get("enabled"),
                    "value": event.get("data", {}).get("value") or event.get("value"),
                    "url": event.get("url"),
                    "session_id": event.get("session_id"),
                }, site_id=site_id))
            except Exception:
                pass  # Don't fail tracking for webhook errors
        
        return cors_response({
            "success": True, 
            "event_id": event_id
        })
        
    except Exception as e:
        # Don't return 500 for tracking - just log and return success
        print(f"Tracking error (non-fatal): {e}")
        return cors_response({"success": True, "event_id": None})


@router.get("/events", response_model=EventsResponse)
async def get_events(
    site_id: str = Query(..., description="Site ID to get events for"),
    date_from: Optional[str] = Query(None, description="Start date (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date (ISO format)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
):
    """
    Get tracking events for a site.
    Requires authentication - only returns events for sites owned by the user.
    """
    try:
        supabase = get_supabase()
        
        # Verify user owns this site
        site_result = supabase.table("sites").select("id").eq("id", site_id).eq("user_id", current_user.id).single().execute()
        
        if not site_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this site"
            )
        
        # Build query
        query = supabase.table("tracking_events").select("*", count="exact").eq("site_id", site_id)
        
        if date_from:
            query = query.gte("timestamp", date_from)
        if date_to:
            query = query.lte("timestamp", date_to)
        if event_type:
            query = query.eq("type", event_type)
        
        # Pagination
        offset = (page - 1) * page_size
        query = query.order("timestamp", desc=True).range(offset, offset + page_size - 1)
        
        result = query.execute()
        
        events = [
            TrackingEventDB(
                id=e["id"],
                site_id=e["site_id"],
                type=e["type"],
                timestamp=e["timestamp"],
                url=e["url"],
                session_id=e.get("session_id"),
                data=e.get("data"),
                created_at=e["created_at"],
            )
            for e in (result.data or [])
        ]
        
        return EventsResponse(
            events=events,
            total=result.count or 0,
            page=page,
            page_size=page_size,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get events: {str(e)}"
        )


@router.get("/analytics", response_model=AnalyticsSummary)
async def get_analytics(
    site_id: str = Query(..., description="Site ID"),
    period: str = Query("week", description="Period: day, week, or month"),
    current_user: User = Depends(get_current_user),
):
    """
    Get analytics summary for a site.
    """
    try:
        supabase = get_supabase()
        
        # Verify user owns this site
        site_result = supabase.table("sites").select("id").eq("id", site_id).eq("user_id", current_user.id).single().execute()
        
        if not site_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this site"
            )
        
        # Calculate date range
        now = datetime.utcnow()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # week
            start_date = now - timedelta(days=7)
        
        # Get events for the period
        result = supabase.table("tracking_events") \
            .select("type, session_id") \
            .eq("site_id", site_id) \
            .gte("timestamp", start_date.isoformat()) \
            .execute()
        
        events = result.data or []
        
        # Calculate metrics
        total_events = len(events)
        unique_sessions = len(set(e.get("session_id") for e in events if e.get("session_id")))
        page_views = sum(1 for e in events if e.get("type") == "pageview")
        interactions = sum(1 for e in events if e.get("type") in ["click", "scroll", "form"])
        
        return AnalyticsSummary(
            total_events=total_events,
            unique_sessions=unique_sessions,
            page_views=page_views,
            interactions=interactions,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )


@router.post("/sites", response_model=SiteWithSnippet)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new site for tracking.
    Returns the site info and embed snippet.
    """
    try:
        supabase = get_supabase()
        
        # Check if site already exists for this user
        existing = supabase.table("sites") \
            .select("id") \
            .eq("user_id", current_user.id) \
            .eq("hostname", site_data.hostname) \
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site already registered"
            )
        
        # Create the site
        insert_data = {
            "user_id": current_user.id,
            "hostname": site_data.hostname,
            "name": site_data.name or site_data.hostname,
        }
        
        result = supabase.table("sites").insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create site"
            )
        
        site = Site(
            id=result.data[0]["id"],
            hostname=result.data[0]["hostname"],
            name=result.data[0].get("name"),
            created_at=result.data[0]["created_at"],
        )
        
        snippet = generate_embed_snippet(site.id)
        
        return SiteWithSnippet(site=site, snippet=snippet)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create site: {str(e)}"
        )


@router.get("/sites")
async def get_sites(
    current_user: User = Depends(get_current_user),
):
    """
    List all sites for the current user.
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table("sites") \
            .select("*") \
            .eq("user_id", current_user.id) \
            .order("created_at", desc=True) \
            .execute()
        
        sites = [
            Site(
                id=s["id"],
                hostname=s["hostname"],
                name=s.get("name"),
                created_at=s["created_at"],
            )
            for s in (result.data or [])
        ]
        
        return {"sites": sites}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sites: {str(e)}"
        )


@router.delete("/sites/{site_id}")
async def delete_site(
    site_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a site and all its tracking data.
    """
    try:
        supabase = get_supabase()
        
        # Verify user owns this site
        site_result = supabase.table("sites") \
            .select("id") \
            .eq("id", site_id) \
            .eq("user_id", current_user.id) \
            .single() \
            .execute()
        
        if not site_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Delete site (cascade will delete events)
        supabase.table("sites").delete().eq("id", site_id).execute()
        
        return {"success": True, "message": "Site deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete site: {str(e)}"
        )
