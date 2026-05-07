# 👤 SHARED: User Preferences API Routes
# Used by Extension for syncing accessibility preferences

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from pydantic import BaseModel
from app.database import get_supabase
from app.models.auth import User
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/user", tags=["preferences"])


class AccessibilityPreferences(BaseModel):
    """User accessibility preferences"""
    highContrast: bool = False
    fontSize: int = 16
    dyslexiaFont: bool = False
    focusMode: bool = False
    reducedMotion: bool = False
    customCSS: str = ""


class SitePreference(BaseModel):
    """Preference for a specific site"""
    hostname: str
    preferences: AccessibilityPreferences
    enabled: bool = True


class UpdatePreferencesRequest(BaseModel):
    """Request to update site preferences"""
    hostname: str
    preferences: AccessibilityPreferences
    enabled: bool = True


class GlobalPreferencesRequest(BaseModel):
    """Request to update global preferences"""
    preferences: AccessibilityPreferences


@router.get("/preferences")
async def get_preferences(
    hostname: Optional[str] = Query(None, description="Get preferences for specific hostname"),
    current_user: User = Depends(get_current_user),
):
    """
    Get user preferences.
    If hostname is provided, returns preferences for that site.
    Otherwise, returns all site preferences and global preferences.
    """
    try:
        supabase = get_supabase()
        
        # Get global preferences
        global_result = supabase.table("global_preferences") \
            .select("*") \
            .eq("user_id", current_user.id) \
            .single() \
            .execute()
        
        global_prefs = global_result.data.get("preferences") if global_result.data else {
            "highContrast": False,
            "fontSize": 16,
            "dyslexiaFont": False,
            "focusMode": False,
            "reducedMotion": False,
            "customCSS": "",
        }
        
        if hostname:
            # Get site-specific preferences
            site_result = supabase.table("user_preferences") \
                .select("*") \
                .eq("user_id", current_user.id) \
                .eq("site_hostname", hostname) \
                .single() \
                .execute()
            
            if site_result.data:
                return {
                    "hostname": hostname,
                    "preferences": site_result.data.get("preferences", global_prefs),
                    "enabled": site_result.data.get("enabled", True),
                    "has_site_specific": True,
                }
            else:
                # Return global preferences as fallback
                return {
                    "hostname": hostname,
                    "preferences": global_prefs,
                    "enabled": True,
                    "has_site_specific": False,
                }
        else:
            # Get all site preferences
            sites_result = supabase.table("user_preferences") \
                .select("*") \
                .eq("user_id", current_user.id) \
                .execute()
            
            site_preferences = [
                {
                    "hostname": p["site_hostname"],
                    "preferences": p.get("preferences", {}),
                    "enabled": p.get("enabled", True),
                }
                for p in (sites_result.data or [])
            ]
            
            return {
                "global_preferences": global_prefs,
                "site_preferences": site_preferences,
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get preferences: {str(e)}"
        )


@router.post("/preferences")
async def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update preferences for a specific site.
    Creates the preference if it doesn't exist.
    """
    try:
        supabase = get_supabase()
        
        # Check if preference exists
        existing = supabase.table("user_preferences") \
            .select("id") \
            .eq("user_id", current_user.id) \
            .eq("site_hostname", request.hostname) \
            .single() \
            .execute()
        
        prefs_dict = request.preferences.dict()
        
        if existing.data:
            # Update existing
            supabase.table("user_preferences") \
                .update({
                    "preferences": prefs_dict,
                    "enabled": request.enabled,
                }) \
                .eq("id", existing.data["id"]) \
                .execute()
        else:
            # Insert new
            supabase.table("user_preferences") \
                .insert({
                    "user_id": current_user.id,
                    "site_hostname": request.hostname,
                    "preferences": prefs_dict,
                    "enabled": request.enabled,
                }) \
                .execute()
        
        return {"success": True, "hostname": request.hostname}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )


@router.post("/preferences/global")
async def update_global_preferences(
    request: GlobalPreferencesRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update global preferences (default for all sites).
    """
    try:
        supabase = get_supabase()
        
        prefs_dict = request.preferences.dict()
        
        # Check if global preferences exist
        existing = supabase.table("global_preferences") \
            .select("id") \
            .eq("user_id", current_user.id) \
            .single() \
            .execute()
        
        if existing.data:
            # Update existing
            supabase.table("global_preferences") \
                .update({"preferences": prefs_dict}) \
                .eq("id", existing.data["id"]) \
                .execute()
        else:
            # Insert new
            supabase.table("global_preferences") \
                .insert({
                    "user_id": current_user.id,
                    "preferences": prefs_dict,
                }) \
                .execute()
        
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update global preferences: {str(e)}"
        )


@router.delete("/preferences/{hostname}")
async def delete_site_preferences(
    hostname: str,
    current_user: User = Depends(get_current_user),
):
    """
    Delete site-specific preferences (will fall back to global).
    """
    try:
        supabase = get_supabase()
        
        supabase.table("user_preferences") \
            .delete() \
            .eq("user_id", current_user.id) \
            .eq("site_hostname", hostname) \
            .execute()
        
        return {"success": True, "message": f"Preferences for {hostname} deleted"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete preferences: {str(e)}"
        )
