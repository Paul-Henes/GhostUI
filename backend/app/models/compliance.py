# 👤 LUCAS: Compliance Models

from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"


class ScanRequest(BaseModel):
    """Compliance scan request"""
    url: str


class ComplianceScan(BaseModel):
    """Compliance scan"""
    id: str
    url: str
    status: ScanStatus
    created_at: str
    completed_at: Optional[str] = None
    issue_count: int = 0


class ComplianceIssue(BaseModel):
    """Accessibility issue"""
    id: str
    scan_id: str
    severity: IssueSeverity
    wcag_criterion: str
    description: str
    element_selector: Optional[str] = None
    suggested_fix: Optional[str] = None


class FixRequest(BaseModel):
    """Code fix request"""
    issue_id: str


class FixResponse(BaseModel):
    """Generated code fix"""
    success: bool
    issue_id: str
    original_code: Optional[str] = None
    fixed_code: Optional[str] = None
    explanation: Optional[str] = None
    error: Optional[str] = None
