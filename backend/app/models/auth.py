# 👤 JANNIK: Auth Models

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class User(BaseModel):
    """User response"""
    id: str
    email: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    """Auth response with token"""
    success: bool
    user: Optional[User] = None
    token: Optional[str] = None
    error: Optional[str] = None
