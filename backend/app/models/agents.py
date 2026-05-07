# 👤 JANNIK: Agent Models

from pydantic import BaseModel
from typing import Optional, List


class AgentTask(BaseModel):
    """Task for an AI agent"""
    agent_type: str  # auditor, fixer, analyzer, personalizer
    input_data: dict


class AgentResult(BaseModel):
    """Result from an AI agent"""
    success: bool
    agent_type: str
    output: Optional[dict] = None
    error: Optional[str] = None


# WCAG Accessibility Audit Models

class WCAGIssue(BaseModel):
    """A single WCAG accessibility issue"""
    criterion: str  # e.g. "1.1.1", "1.4.3"
    level: str  # A, AA, AAA
    severity: str  # critical, serious, moderate, minor
    description: str
    element: Optional[str] = None
    suggestion: str


class AuditorResult(BaseModel):
    """Result from the accessibility auditor agent"""
    url: str
    score: int  # 0-100
    issues: List[WCAGIssue]
    passed_checks: int
    total_checks: int
    recommendations: List[str] = []
    error: Optional[str] = None


class AuditorRunRequest(BaseModel):
    """Request to run the auditor agent"""
    url: str
    screenshot: Optional[str] = None  # Base64 encoded screenshot
