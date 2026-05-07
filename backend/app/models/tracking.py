# 👤 JANNIK: Tracking Models

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TrackingEvent(BaseModel):
    """Tracking event from embed script"""
    type: str
    timestamp: str
    url: str
    session_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class TrackingEventDB(BaseModel):
    """Tracking event with database fields"""
    id: str
    site_id: str
    type: str
    timestamp: str
    url: str
    session_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    created_at: str


class SiteCreate(BaseModel):
    """Site creation request"""
    hostname: str
    name: Optional[str] = None


class Site(BaseModel):
    """Site response"""
    id: str
    hostname: str
    name: Optional[str] = None
    created_at: str


class SiteWithSnippet(BaseModel):
    """Site with embed snippet"""
    site: Site
    snippet: str


class AnalyticsSummary(BaseModel):
    """Analytics summary for a site"""
    total_events: int
    unique_sessions: int
    page_views: int
    interactions: int


class EventsResponse(BaseModel):
    """Paginated events response"""
    events: List[TrackingEventDB]
    total: int
    page: int
    page_size: int
