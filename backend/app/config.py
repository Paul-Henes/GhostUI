# Application configuration
# Loads environment variables

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings from environment variables"""
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # AI Services
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # n8n
    N8N_WEBHOOK_URL: str = os.getenv("N8N_WEBHOOK_URL", "")
    
    # App
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    BACKEND_PUBLIC_URL: str = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")
    
    # CORS - Additional allowed origins (comma-separated)
    # Use this to add origins without code changes
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")


settings = Settings()
