# 👤 JANNIK: Auth Middleware
# JWT validation and user extraction for protected routes
# Extended by Lucas: API key support for n8n integration

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.database import get_supabase
from app.models.auth import User
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

# API Key prefix for Ghost-UI
API_KEY_PREFIX = "ghostui_"


async def validate_api_key(api_key: str) -> Optional[User]:
    """
    Validate an API key and return the associated user.
    API keys are stored in the 'api_keys' table in Supabase.
    """
    if not api_key.startswith(API_KEY_PREFIX):
        return None
    
    try:
        supabase = get_supabase()
        
        # Look up the API key
        response = supabase.table("api_keys").select(
            "user_id, user_email, is_active"
        ).eq("key", api_key).eq("is_active", True).execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        key_data = response.data[0]
        
        return User(
            id=str(key_data["user_id"]),
            email=key_data.get("user_email", ""),
            created_at=None
        )
    except Exception as e:
        logger.warning(f"API key validation error: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency that validates JWT token OR API key and returns the current user.
    Raises 401 if token/key is invalid or expired.
    
    Supports:
    - Supabase JWT tokens (from dashboard login)
    - Ghost-UI API keys (for n8n/automation, prefix: ghostui_)
    """
    token = credentials.credentials
    
    # Check if it's an API key (starts with ghostui_)
    if token.startswith(API_KEY_PREFIX):
        user = await validate_api_key(token)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Otherwise, validate as JWT token
    try:
        supabase = get_supabase()
        
        # Verify the JWT token with Supabase
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_data = response.user
        # Convert datetime to string if present
        created_at = None
        if hasattr(user_data, 'created_at') and user_data.created_at:
            created_at = str(user_data.created_at)
        
        return User(
            id=str(user_data.id),
            email=user_data.email or "",
            created_at=created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
) -> Optional[User]:
    """
    Optional auth dependency - returns User if authenticated, None otherwise.
    Useful for endpoints that work both authenticated and anonymously.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
