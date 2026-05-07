# 👤 JANNIK: Auth API Routes
# Extended by Lucas: API key management for n8n integration

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import secrets
from app.database import get_supabase
from app.models.auth import UserCreate, UserLogin, User, AuthResponse
from app.middleware.auth import get_current_user, API_KEY_PREFIX

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ===========================================
# API Key Models
# ===========================================

class ApiKeyCreate(BaseModel):
    name: str = "Default API Key"

class ApiKey(BaseModel):
    id: str
    name: str
    key_preview: str  # Only show last 8 chars
    created_at: str
    is_active: bool

class ApiKeyResponse(BaseModel):
    success: bool
    api_key: Optional[str] = None  # Full key, only returned on creation
    keys: Optional[List[ApiKey]] = None
    error: Optional[str] = None


@router.post("/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate):
    """
    Register a new user with Supabase Auth.
    Returns user info and access token on success.
    """
    try:
        supabase = get_supabase()
        
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })
        
        if response.user is None:
            return AuthResponse(
                success=False,
                error="Failed to create user. Email may already be registered."
            )
        
        user = User(
            id=str(response.user.id),
            email=response.user.email or "",
            created_at=response.user.created_at if hasattr(response.user, 'created_at') else None
        )
        
        return AuthResponse(
            success=True,
            user=user,
            token=response.session.access_token if response.session else None
        )
        
    except Exception as e:
        return AuthResponse(
            success=False,
            error=str(e)
        )


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """
    Authenticate user with email and password.
    Returns access token on success.
    """
    try:
        supabase = get_supabase()
        
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })
        
        if response.user is None:
            return AuthResponse(
                success=False,
                error="Invalid email or password"
            )
        
        user = User(
            id=str(response.user.id),
            email=response.user.email or "",
            created_at=response.user.created_at if hasattr(response.user, 'created_at') else None
        )
        
        return AuthResponse(
            success=True,
            user=user,
            token=response.session.access_token if response.session else None
        )
        
    except Exception as e:
        return AuthResponse(
            success=False,
            error="Invalid email or password"
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Sign out the current user.
    Invalidates the current session token.
    """
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        
        return {"success": True, "message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to logout: {str(e)}"
        )


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's information.
    Requires valid Bearer token in Authorization header.
    """
    return current_user


# ===========================================
# API Key Management (for n8n integration)
# ===========================================

@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    request: ApiKeyCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new API key for the current user.
    The full key is only returned once - store it securely!
    
    Use this key in n8n or other integrations with:
    Authorization: Bearer ghostui_xxxxx
    """
    try:
        supabase = get_supabase()
        
        # Generate a secure API key
        random_part = secrets.token_urlsafe(32)
        api_key = f"{API_KEY_PREFIX}{random_part}"
        
        # Store in database
        key_data = {
            "user_id": current_user.id,
            "user_email": current_user.email,
            "key": api_key,
            "name": request.name,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        response = supabase.table("api_keys").insert(key_data).execute()
        
        if not response.data:
            return ApiKeyResponse(
                success=False,
                error="Failed to create API key"
            )
        
        return ApiKeyResponse(
            success=True,
            api_key=api_key  # Only time the full key is returned!
        )
        
    except Exception as e:
        return ApiKeyResponse(
            success=False,
            error=f"Failed to create API key: {str(e)}"
        )


@router.get("/api-keys", response_model=ApiKeyResponse)
async def list_api_keys(current_user: User = Depends(get_current_user)):
    """
    List all API keys for the current user.
    Only shows key previews (last 8 characters) for security.
    """
    try:
        supabase = get_supabase()
        
        response = supabase.table("api_keys").select(
            "id, name, key, created_at, is_active"
        ).eq("user_id", current_user.id).order("created_at", desc=True).execute()
        
        keys = []
        for row in response.data or []:
            keys.append(ApiKey(
                id=str(row["id"]),
                name=row["name"],
                key_preview=f"...{row['key'][-8:]}",  # Last 8 chars only
                created_at=row["created_at"],
                is_active=row["is_active"],
            ))
        
        return ApiKeyResponse(
            success=True,
            keys=keys
        )
        
    except Exception as e:
        return ApiKeyResponse(
            success=False,
            error=f"Failed to list API keys: {str(e)}"
        )


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Revoke (deactivate) an API key.
    The key will no longer work for authentication.
    """
    try:
        supabase = get_supabase()
        
        # Verify ownership and deactivate
        response = supabase.table("api_keys").update(
            {"is_active": False}
        ).eq("id", key_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found or not owned by you"
            )
        
        return {"success": True, "message": "API key revoked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke API key: {str(e)}"
        )
