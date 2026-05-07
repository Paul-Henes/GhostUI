# 👤 LUCAS: Compliance API Routes
# WCAG/EAA Compliance Scanner endpoints
# INTEGRATED: Jannik's DB-Layer + Lucas' axe-core + AI Fix Endpoint

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid
import asyncio
import logging
import base64

# Playwright for screenshots
from playwright.async_api import async_playwright

# Gemini service (built by Jannik)
from app.services.gemini_service import analyze_screenshot

# Database and auth (from Jannik's error-fixes)
from app.database import get_supabase
from app.middleware.auth import get_current_user, get_current_user_optional
from app.models.auth import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

# ===========================================
# Enums
# ===========================================

class ScanStatus(str, Enum):
    PENDING = "pending"
    SCANNING = "scanning"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"

class IssueSource(str, Enum):
    AXE_CORE = "axe-core"
    GEMINI = "gemini"
    BOTH = "both"

class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class OrganizationType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"

# ===========================================
# Request/Response Models
# ===========================================

class ScanOptions(BaseModel):
    waitForNetworkIdle: bool = True
    dismissCookieBanner: bool = True
    timeout: int = 300000  # 5 minutes for slow sites
    fullPage: bool = True

class ScanRequest(BaseModel):
    url: HttpUrl
    userId: Optional[str] = None
    options: Optional[ScanOptions] = None

class ScanResponse(BaseModel):
    scanId: str
    status: ScanStatus
    message: Optional[str] = None

class ComplianceIssue(BaseModel):
    id: str
    scanId: str
    severity: IssueSeverity
    wcagCriterion: str
    description: str
    location: Optional[str] = None
    recommendation: str
    source: IssueSource
    confidence: ConfidenceLevel
    elementHtml: Optional[str] = None
    screenshotRegion: Optional[dict] = None
    isResolved: bool = False
    resolvedAt: Optional[str] = None

class ComplianceScan(BaseModel):
    id: str
    url: str
    userId: str
    status: ScanStatus
    score: Optional[int] = None
    screenshotUrl: Optional[str] = None
    issueCount: int = 0
    criticalCount: int = 0
    seriousCount: int = 0
    moderateCount: int = 0
    minorCount: int = 0
    createdAt: str
    completedAt: Optional[str] = None
    errorMessage: Optional[str] = None
    # Progress tracking for frontend display
    progressMessage: Optional[str] = None
    progressPercent: int = 0

class PaginatedIssues(BaseModel):
    issues: List[ComplianceIssue]
    total: int
    page: int
    pageSize: int
    totalPages: int

class AuditRequest(BaseModel):
    scanId: str

class StatementRequest(BaseModel):
    scanId: str
    organizationType: OrganizationType
    organizationName: str
    websiteUrl: str
    contactEmail: str
    contactPhone: Optional[str] = None
    bundesland: Optional[str] = None
    customSchlichtungsstelle: Optional[str] = None
    justifications: Optional[List[str]] = None  # User-provided justifications for non-accessible content

class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# ===========================================
# AI Code Fix Models (Lucas)
# ===========================================

class FixRequest(BaseModel):
    code: Optional[str] = None  # Optional original code to improve fix quality


class CodeFixResponse(BaseModel):
    fixedCode: str
    explanation: str
    changes: List[str]

# ===========================================
# Database Helper Functions (from Jannik)
# ===========================================

def get_scan_from_db(scan_id: str) -> Optional[ComplianceScan]:
    """Fetch a scan from the database by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("compliance_scans").select("*").eq("id", scan_id).single().execute()
        if result.data:
            return _db_row_to_scan(result.data)
        return None
    except Exception as e:
        logger.error(f"Error fetching scan {scan_id}: {e}")
        return None


def save_scan_to_db(scan: ComplianceScan) -> bool:
    """Save or update a scan in the database."""
    try:
        supabase = get_supabase()
        data = {
            "id": scan.id,
            "user_id": scan.userId if scan.userId != "anonymous" else None,
            "url": scan.url,
            "status": scan.status.value if isinstance(scan.status, Enum) else scan.status,
            "score": scan.score,
            "screenshot_url": scan.screenshotUrl,
            "issue_count": scan.issueCount,
            "critical_count": scan.criticalCount,
            "serious_count": scan.seriousCount,
            "moderate_count": scan.moderateCount,
            "minor_count": scan.minorCount,
            "progress_message": scan.progressMessage,
            "progress_percent": scan.progressPercent,
            "error_message": scan.errorMessage,
            "created_at": scan.createdAt,
            "completed_at": scan.completedAt,
        }
        supabase.table("compliance_scans").upsert(data).execute()
        return True
    except Exception as e:
        logger.error(f"Error saving scan {scan.id}: {e}")
        return False


def get_issues_from_db(scan_id: str) -> List[ComplianceIssue]:
    """Fetch all issues for a scan from the database."""
    try:
        supabase = get_supabase()
        result = supabase.table("compliance_issues").select("*").eq("scan_id", scan_id).execute()
        return [_db_row_to_issue(row) for row in result.data] if result.data else []
    except Exception as e:
        logger.error(f"Error fetching issues for scan {scan_id}: {e}")
        return []


def get_issue_from_db(issue_id: str) -> Optional[ComplianceIssue]:
    """Fetch a single issue by ID from the database."""
    try:
        supabase = get_supabase()
        result = supabase.table("compliance_issues").select("*").eq("id", issue_id).single().execute()
        if result.data:
            return _db_row_to_issue(result.data)
        return None
    except Exception as e:
        logger.error(f"Error fetching issue {issue_id}: {e}")
        return None


def save_issues_to_db(scan_id: str, issues: List[ComplianceIssue]) -> bool:
    """Save issues to the database."""
    try:
        supabase = get_supabase()
        # Delete existing issues for this scan first
        supabase.table("compliance_issues").delete().eq("scan_id", scan_id).execute()
        
        if issues:
            data = [{
                "id": issue.id,
                "scan_id": scan_id,
                "severity": issue.severity.value if isinstance(issue.severity, Enum) else issue.severity,
                "wcag_criterion": issue.wcagCriterion,
                "description": issue.description,
                "location": issue.location,
                "recommendation": issue.recommendation,
                "source": issue.source.value if isinstance(issue.source, Enum) else issue.source,
                "confidence": issue.confidence.value if isinstance(issue.confidence, Enum) else issue.confidence,
                "element_html": issue.elementHtml,
                "screenshot_region": issue.screenshotRegion,
                "is_resolved": issue.isResolved,
                "resolved_at": issue.resolvedAt,
            } for issue in issues]
            supabase.table("compliance_issues").insert(data).execute()
        return True
    except Exception as e:
        logger.error(f"Error saving issues for scan {scan_id}: {e}")
        return False


def update_scan_field(scan_id: str, field: str, value) -> bool:
    """Update a single field on a scan."""
    try:
        supabase = get_supabase()
        # Convert enum values
        if isinstance(value, Enum):
            value = value.value
        supabase.table("compliance_scans").update({field: value}).eq("id", scan_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error updating scan {scan_id} field {field}: {e}")
        return False


def _db_row_to_scan(row: dict) -> ComplianceScan:
    """Convert a database row to a ComplianceScan object."""
    return ComplianceScan(
        id=row["id"],
        url=row["url"],
        userId=row["user_id"] or "anonymous",
        status=ScanStatus(row["status"]),
        score=row["score"],
        screenshotUrl=row["screenshot_url"],
        issueCount=row["issue_count"] or 0,
        criticalCount=row["critical_count"] or 0,
        seriousCount=row["serious_count"] or 0,
        moderateCount=row["moderate_count"] or 0,
        minorCount=row["minor_count"] or 0,
        createdAt=row["created_at"],
        completedAt=row["completed_at"],
        errorMessage=row["error_message"],
        progressMessage=row["progress_message"],
        progressPercent=row["progress_percent"] or 0,
    )


def _db_row_to_issue(row: dict) -> ComplianceIssue:
    """Convert a database row to a ComplianceIssue object."""
    return ComplianceIssue(
        id=row["id"],
        scanId=row["scan_id"],
        severity=IssueSeverity(row["severity"]),
        wcagCriterion=row["wcag_criterion"],
        description=row["description"],
        location=row["location"],
        recommendation=row["recommendation"],
        source=IssueSource(row["source"]) if row["source"] else IssueSource.GEMINI,
        confidence=ConfidenceLevel(row["confidence"]) if row["confidence"] else ConfidenceLevel.MEDIUM,
        elementHtml=row["element_html"],
        screenshotRegion=row["screenshot_region"],
        isResolved=row["is_resolved"] or False,
        resolvedAt=row["resolved_at"],
    )

# ===========================================
# Scan Endpoints
# ===========================================

@router.post("/scan", response_model=ApiResponse)
async def start_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Start a new compliance scan for a URL.
    The scan runs in the background and can be polled for results.
    """
    scan_id = str(uuid.uuid4())
    
    # Use authenticated user ID if available, otherwise from request or anonymous
    user_id = current_user.id if current_user else (request.userId or "anonymous")
    
    # Create scan record
    scan = ComplianceScan(
        id=scan_id,
        url=str(request.url),
        userId=user_id,
        status=ScanStatus.PENDING,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    
    # Save to database
    if not save_scan_to_db(scan):
        raise HTTPException(status_code=500, detail="Failed to create scan record")
    
    # Run scan in background
    background_tasks.add_task(
        run_scan_task,
        scan_id=scan_id,
        url=str(request.url),
        options=request.options or ScanOptions(),
    )
    
    return ApiResponse(
        success=True,
        data=ScanResponse(
            scanId=scan_id,
            status=ScanStatus.PENDING,
            message="Scan started"
        ).model_dump()
    )


@router.get("/scan/{scan_id}", response_model=ApiResponse)
async def get_scan(scan_id: str):
    """
    Get scan status and results.
    """
    scan = get_scan_from_db(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return ApiResponse(success=True, data=scan.model_dump())


@router.get("/scan/{scan_id}/issues", response_model=ApiResponse)
async def get_scan_issues(
    scan_id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    severity: Optional[str] = None,
    source: Optional[str] = None,
    confidence: Optional[str] = None,
    showResolved: bool = False,
):
    """
    Get paginated issues for a scan with optional filtering.
    """
    scan = get_scan_from_db(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    issues = get_issues_from_db(scan_id)
    
    # Apply filters
    filtered = issues
    
    if severity:
        severities = severity.split(",")
        filtered = [i for i in filtered if i.severity in severities]
    
    if source:
        sources = source.split(",")
        filtered = [i for i in filtered if i.source in sources]
    
    if confidence:
        confidences = confidence.split(",")
        filtered = [i for i in filtered if i.confidence in confidences]
    
    if not showResolved:
        filtered = [i for i in filtered if not i.isResolved]
    
    # Paginate
    total = len(filtered)
    total_pages = (total + pageSize - 1) // pageSize
    start = (page - 1) * pageSize
    end = start + pageSize
    paginated = filtered[start:end]
    
    return ApiResponse(
        success=True,
        data=PaginatedIssues(
            issues=paginated,
            total=total,
            page=page,
            pageSize=pageSize,
            totalPages=total_pages,
        ).model_dump()
    )


@router.get("/scans", response_model=ApiResponse)
async def get_user_scans(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's scan history. Requires authentication.
    """
    try:
        supabase = get_supabase()
        
        # Get total count for user
        count_result = supabase.table("compliance_scans")\
            .select("*", count="exact")\
            .eq("user_id", current_user.id)\
            .execute()
        total = count_result.count or 0
        
        # Get paginated scans for user, ordered by created_at desc
        offset = (page - 1) * pageSize
        result = supabase.table("compliance_scans")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .range(offset, offset + pageSize - 1)\
            .execute()
        
        scans = [_db_row_to_scan(row) for row in result.data] if result.data else []
        
        return ApiResponse(
            success=True,
            data={
                "scans": [s.model_dump() for s in scans],
                "total": total,
            }
        )
    except Exception as e:
        logger.error(f"Error fetching user scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scans")


@router.post("/issue/{issue_id}/resolve", response_model=ApiResponse)
async def resolve_issue(issue_id: str):
    """
    Mark an issue as resolved.
    """
    try:
        supabase = get_supabase()
        resolved_at = datetime.utcnow().isoformat() + "Z"
        
        # Update the issue
        result = supabase.table("compliance_issues")\
            .update({"is_resolved": True, "resolved_at": resolved_at})\
            .eq("id", issue_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Fetch the updated issue
        issue_result = supabase.table("compliance_issues")\
            .select("*")\
            .eq("id", issue_id)\
            .single()\
            .execute()
        
        if issue_result.data:
            issue = _db_row_to_issue(issue_result.data)
            return ApiResponse(success=True, data=issue.model_dump())
        
        raise HTTPException(status_code=404, detail="Issue not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving issue {issue_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve issue")


# ===========================================
# AI Code Fix Endpoint (Lucas)
# ===========================================

@router.post("/issue/{issue_id}/fix", response_model=ApiResponse)
async def generate_fix(issue_id: str, request: FixRequest):
    """
    Generate an AI-powered code fix for an accessibility issue.
    Uses GPT-4 to analyze the issue and generate a targeted fix.
    """
    # Find the issue from database
    found_issue = get_issue_from_db(issue_id)
    
    if not found_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    try:
        # Import the OpenAI service
        from app.services.openai_service import generate_code_fix
        
        # Prepare issue dict for the service
        issue_dict = {
            "wcag_criterion": found_issue.wcagCriterion,
            "description": found_issue.description,
            "element_selector": found_issue.location,
            "recommendation": found_issue.recommendation,
        }
        
        # Get original code (from request or issue)
        original_code = request.code or found_issue.elementHtml or ""
        
        # Generate fix
        result = await generate_code_fix(issue_dict, original_code)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return ApiResponse(
            success=True,
            data=CodeFixResponse(
                fixedCode=result.get("fixed_code", ""),
                explanation=result.get("explanation", ""),
                changes=result.get("changes", []),
            ).model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate fix for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate fix: {str(e)}")


# ===========================================
# Report Generation Endpoints
# ===========================================

@router.post("/audit", response_model=ApiResponse)
async def generate_audit(request: AuditRequest):
    """
    Generate an audit report for a completed scan.
    Returns JSON data along with HTML and PDF download URLs.
    """
    from app.services.report_service import generate_and_upload_audit_report
    
    scan = get_scan_from_db(request.scanId)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    issues = get_issues_from_db(request.scanId)
    
    if scan.status != ScanStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Scan not completed")
    
    # Determine conformance level
    conformance = "not"
    if scan.score and scan.score >= 90:
        conformance = "fully"
    elif scan.score and scan.score >= 70:
        conformance = "partially"
    
    generated_at = datetime.utcnow().isoformat() + "Z"
    
    # Generate PDF and HTML reports and upload to storage
    html_url, pdf_url = await generate_and_upload_audit_report(
        scan_id=request.scanId,
        scan={
            "id": scan.id,
            "url": scan.url,
            "score": scan.score or 0,
            "criticalCount": scan.criticalCount,
            "seriousCount": scan.seriousCount,
            "moderateCount": scan.moderateCount,
            "minorCount": scan.minorCount,
            "issueCount": scan.issueCount,
        },
        issues=[i.model_dump() for i in issues],
        conformance=conformance,
    )
    
    audit = {
        "id": str(uuid.uuid4()),
        "scanId": request.scanId,
        "generatedAt": generated_at,
        "url": scan.url,
        "overallScore": scan.score or 0,
        "conformanceLevel": conformance,
        "summary": {
            "critical": scan.criticalCount,
            "serious": scan.seriousCount,
            "moderate": scan.moderateCount,
            "minor": scan.minorCount,
            "total": scan.issueCount,
        },
        "issues": [i.model_dump() for i in issues],
        "htmlUrl": html_url,
        "pdfUrl": pdf_url,
    }
    
    return ApiResponse(success=True, data=audit)


@router.post("/statement", response_model=ApiResponse)
async def generate_statement(request: StatementRequest):
    """
    Generate a BFSG-compliant accessibility statement.
    """
    scan = get_scan_from_db(request.scanId)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    issues = get_issues_from_db(request.scanId)
    
    # Determine conformance status
    conformance = "not"
    if scan.score and scan.score >= 90 and scan.criticalCount == 0:
        conformance = "fully"
    elif scan.score and scan.score >= 70:
        conformance = "partially"
    
    # Get non-accessible content - group by severity for better readability
    critical_issues = [i for i in issues if i.severity == IssueSeverity.CRITICAL]
    serious_issues = [i for i in issues if i.severity == IssueSeverity.SERIOUS]
    moderate_issues = [i for i in issues if i.severity == IssueSeverity.MODERATE]
    minor_issues = [i for i in issues if i.severity == IssueSeverity.MINOR]
    
    # Build detailed non-accessible content list
    non_accessible = []
    if critical_issues:
        non_accessible.append("**Kritische Probleme:**")
        for i in critical_issues:
            non_accessible.append(f"- {i.wcagCriterion}: {i.description}")
    if serious_issues:
        non_accessible.append("**Schwerwiegende Probleme:**")
        for i in serious_issues:
            non_accessible.append(f"- {i.wcagCriterion}: {i.description}")
    if moderate_issues:
        non_accessible.append("**Mittlere Probleme:**")
        for i in moderate_issues:
            non_accessible.append(f"- {i.wcagCriterion}: {i.description}")
    
    # Auto-lookup Schlichtungsstelle/Marktüberwachungsbehörde
    schlichtungsstelle = request.customSchlichtungsstelle or get_schlichtungsstelle(request.bundesland)
    markt_behoerde = get_marktuberwachungsbehoerde(request.bundesland)
    
    html_content = generate_statement_html(request, conformance, non_accessible, schlichtungsstelle, markt_behoerde)
    
    # Generate PDF from HTML
    pdf_base64 = None
    try:
        from app.services.report_service import generate_audit_pdf
        pdf_bytes = await generate_audit_pdf(html_content)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to generate PDF for statement: {e}")
    
    statement = {
        "id": str(uuid.uuid4()),
        "scanId": request.scanId,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "conformanceStatus": conformance,
        "nonAccessibleContent": non_accessible,
        "issuesSummary": {
            "critical": len(critical_issues),
            "serious": len(serious_issues),
            "moderate": len(moderate_issues),
            "minor": len(minor_issues),
            "total": len(issues),
        },
        "justifications": request.justifications or [],
        "feedbackMechanism": {
            "email": request.contactEmail,
            "phone": request.contactPhone,
        },
        "schlichtungsstelle": schlichtungsstelle,
        "marktUeberwachungsBehoerde": markt_behoerde,
        "htmlContent": html_content,
        "markdownContent": generate_statement_markdown(request, conformance, non_accessible, schlichtungsstelle, markt_behoerde),
        "pdfBase64": pdf_base64,
    }
    
    return ApiResponse(success=True, data=statement)

# ===========================================
# One-Click Fix Script Endpoint
# ===========================================

@router.get("/fix/{scan_id}.js")
async def get_fix_script(scan_id: str):
    """
    Generate a JavaScript fix script for a completed scan.
    Returns self-contained JS that auto-fixes accessibility issues.
    """
    from fastapi.responses import Response
    
    scan = get_scan_from_db(scan_id)
    if not scan:
        return Response(
            content=f"console.error('Ghost-UI: Scan {scan_id} not found');",
            media_type="application/javascript",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    issues = get_issues_from_db(scan_id)
    
    # Generate fixes based on issue types
    fixes = generate_fixes_from_issues(issues)
    
    # Generate the complete fix script
    script = generate_fix_script(scan_id, scan.url, fixes)
    
    return Response(
        content=script,
        media_type="application/javascript",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
        }
    )


def generate_fixes_from_issues(issues: list) -> dict:
    """
    Analyze issues and generate fix configurations.
    """
    fixes = {
        "altText": [],      # Images missing alt
        "ariaLabels": [],   # Buttons/links without text
        "formLabels": [],   # Inputs without labels
        "skipLink": False,  # Whether to add skip link
        "langAttr": None,   # Language to set if missing
        "headings": [],     # Heading hierarchy fixes
        "contrast": [],     # Low contrast elements
        "focusStyles": True,  # Always add focus styles
    }
    
    for issue in issues:
        wcag = issue.wcagCriterion or ""
        desc = (issue.description or "").lower()
        # Use location as selector (may be CSS selector or XPath)
        selector = issue.location or ""
        # Use elementHtml as context for extracting info
        context = issue.elementHtml or ""
        
        # Image alt text (WCAG 1.1.1)
        if "1.1.1" in wcag or ("alt" in desc and "image" in desc):
            if selector:
                fixes["altText"].append({
                    "selector": selector,
                    "suggestedAlt": extract_suggested_alt_from_context(context),
                })
        
        # Empty buttons/links (WCAG 4.1.2, 2.4.4)
        elif "4.1.2" in wcag or "2.4.4" in wcag or "button" in desc or "link" in desc:
            if "empty" in desc or "missing" in desc or "no accessible name" in desc or "discernible text" in desc:
                if selector:
                    fixes["ariaLabels"].append({
                        "selector": selector,
                        "label": extract_suggested_label_from_context(context),
                    })
        
        # Form labels (WCAG 1.3.1, 3.3.2)
        elif "1.3.1" in wcag or "3.3.2" in wcag or ("label" in desc and ("input" in desc or "form" in desc)):
            if selector:
                fixes["formLabels"].append({
                    "selector": selector,
                    "label": extract_suggested_label_from_context(context),
                })
        
        # Skip link (WCAG 2.4.1)
        elif "2.4.1" in wcag or "skip" in desc or "bypass" in desc:
            fixes["skipLink"] = True
        
        # Language (WCAG 3.1.1)
        elif "3.1.1" in wcag or "lang" in desc:
            fixes["langAttr"] = "de"  # Default to German for BFSG
        
        # Contrast (WCAG 1.4.3, 1.4.6)
        elif "1.4.3" in wcag or "1.4.6" in wcag or "contrast" in desc:
            if selector:
                fixes["contrast"].append({
                    "selector": selector,
                })
        
        # Headings (WCAG 1.3.1, 2.4.6)
        elif "heading" in desc or "h1" in desc or "h2" in desc:
            fixes["headings"].append({
                "selector": selector,
                "issue": issue.description,
            })
    
    return fixes


def extract_suggested_alt_from_context(context: str) -> str:
    """Extract or generate suggested alt text from HTML context."""
    if context:
        import re
        # Look for filename in src attribute
        match = re.search(r'src=["\']([^"\']+)["\']', context)
        if match:
            filename = match.group(1).split('/')[-1].split('.')[0].split('?')[0]
            # Clean up filename
            clean_name = filename.replace('-', ' ').replace('_', ' ')
            if clean_name and len(clean_name) > 2:
                return clean_name.title()
        # Look for title attribute
        match = re.search(r'title=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1)
    return "Bild"  # German for "Image"


def extract_suggested_label_from_context(context: str) -> str:
    """Extract or generate suggested label from HTML context."""
    if context:
        import re
        # Look for placeholder
        match = re.search(r'placeholder=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1)
        # Look for title
        match = re.search(r'title=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1)
        # Look for name attribute
        match = re.search(r'name=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1).replace('-', ' ').replace('_', ' ').title()
        # Look for aria-label
        match = re.search(r'aria-label=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1)
        # Look for id
        match = re.search(r'id=["\']([^"\']+)["\']', context)
        if match:
            return match.group(1).replace('-', ' ').replace('_', ' ').title()
    return "Interaktives Element"


def generate_fix_script(scan_id: str, url: str, fixes: dict) -> str:
    """
    Generate the complete fix script with all fixes and widget.
    """
    import json
    
    fixes_json = json.dumps(fixes, ensure_ascii=False)
    
    return f'''/**
 * Ghost-UI Accessibility Fix Script
 * Generated for: {url}
 * Scan ID: {scan_id}
 * 
 * This script automatically fixes accessibility issues found during the scan
 * and provides an interactive widget for user preferences.
 */
(function() {{
  'use strict';
  
  // Prevent double initialization
  if (window.__GHOSTUI_LOADED__) return;
  window.__GHOSTUI_LOADED__ = true;
  
  const FIXES = {fixes_json};
  const SCAN_ID = '{scan_id}';
  const PREFS_KEY = 'ghostui_prefs';
  
  // Load saved preferences
  function loadPrefs() {{
    try {{
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {{}};
    }} catch (e) {{
      return {{}};
    }}
  }}
  
  function savePrefs(prefs) {{
    try {{
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }} catch (e) {{}}
  }}
  
  // ============================================
  // AUTO-FIX FUNCTIONS
  // ============================================
  
  function applyAltTextFixes() {{
    if (!FIXES.altText || !FIXES.altText.length) return;
    
    FIXES.altText.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          if (!el.hasAttribute('alt') || el.getAttribute('alt') === '') {{
            el.setAttribute('alt', fix.suggestedAlt || 'Bild');
            el.dataset.ghostuiFixed = 'alt';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applyAriaFixes() {{
    if (!FIXES.ariaLabels || !FIXES.ariaLabels.length) return;
    
    FIXES.ariaLabels.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          const hasText = el.textContent && el.textContent.trim().length > 0;
          const hasAriaLabel = el.hasAttribute('aria-label');
          const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
          
          if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {{
            el.setAttribute('aria-label', fix.label || 'Interaktives Element');
            el.dataset.ghostuiFixed = 'aria';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applyFormFixes() {{
    if (!FIXES.formLabels || !FIXES.formLabels.length) return;
    
    FIXES.formLabels.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          const id = el.id || 'ghostui-input-' + Math.random().toString(36).substr(2, 9);
          const hasLabel = document.querySelector('label[for="' + id + '"]');
          const hasAriaLabel = el.hasAttribute('aria-label');
          
          if (!hasLabel && !hasAriaLabel) {{
            el.id = id;
            el.setAttribute('aria-label', fix.label || el.placeholder || 'Eingabefeld');
            el.dataset.ghostuiFixed = 'form';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applySkipLink() {{
    if (!FIXES.skipLink) return;
    if (document.querySelector('.ghostui-skip-link')) return;
    
    const main = document.querySelector('main, [role="main"], #main, #content, .main-content');
    if (!main) return;
    
    const mainId = main.id || 'ghostui-main-content';
    main.id = mainId;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#' + mainId;
    skipLink.className = 'ghostui-skip-link';
    skipLink.textContent = 'Zum Hauptinhalt springen';
    skipLink.style.cssText = `
      position: absolute;
      top: -100px;
      left: 0;
      padding: 8px 16px;
      background: #1e40af;
      color: white;
      text-decoration: none;
      z-index: 100000;
      font-size: 14px;
      transition: top 0.2s;
    `;
    skipLink.addEventListener('focus', () => skipLink.style.top = '0');
    skipLink.addEventListener('blur', () => skipLink.style.top = '-100px');
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }}
  
  function applyLangAttr() {{
    if (!FIXES.langAttr) return;
    
    const html = document.documentElement;
    if (!html.hasAttribute('lang')) {{
      html.setAttribute('lang', FIXES.langAttr);
    }}
  }}
  
  // ============================================
  // CSS INJECTION
  // ============================================
  
  function injectBaseCSS() {{
    if (document.getElementById('ghostui-base-css')) return;
    
    const style = document.createElement('style');
    style.id = 'ghostui-base-css';
    style.textContent = `
      /* Ghost-UI Focus Styles */
      *:focus-visible {{
        outline: 3px solid #2563eb !important;
        outline-offset: 2px !important;
      }}
      
      /* High Contrast Mode */
      body.ghostui-high-contrast {{
        filter: contrast(1.25) !important;
      }}
      body.ghostui-high-contrast img {{
        filter: contrast(0.8) !important;
      }}
      
      /* Large Text Mode */
      body.ghostui-large-text {{
        font-size: 120% !important;
      }}
      body.ghostui-large-text * {{
        line-height: 1.6 !important;
      }}
      
      /* Enhanced Focus Mode */
      body.ghostui-enhanced-focus *:focus {{
        outline: 4px solid #dc2626 !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.2) !important;
      }}
      
      /* Reading Guide */
      .ghostui-reading-guide {{
        position: fixed;
        left: 0;
        right: 0;
        height: 40px;
        background: rgba(255, 255, 0, 0.2);
        pointer-events: none;
        z-index: 99998;
        transition: top 0.05s;
      }}
      
      /* Widget Styles */
      .ghostui-widget {{
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }}
      
      .ghostui-widget-btn {{
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #1e40af;
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.2s, background 0.2s;
      }}
      
      .ghostui-widget-btn:hover {{
        transform: scale(1.1);
        background: #1d4ed8;
      }}
      
      .ghostui-widget-btn svg {{
        width: 28px;
        height: 28px;
      }}
      
      .ghostui-panel {{
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 280px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        display: none;
        overflow: hidden;
      }}
      
      .ghostui-panel.open {{
        display: block;
      }}
      
      .ghostui-panel-header {{
        background: #1e40af;
        color: white;
        padding: 16px;
        font-weight: 600;
        font-size: 16px;
      }}
      
      .ghostui-panel-content {{
        padding: 16px;
      }}
      
      .ghostui-toggle {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid #e5e7eb;
      }}
      
      .ghostui-toggle:last-child {{
        border-bottom: none;
      }}
      
      .ghostui-toggle-label {{
        font-size: 14px;
        color: #374151;
      }}
      
      .ghostui-toggle-switch {{
        width: 44px;
        height: 24px;
        background: #d1d5db;
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;
      }}
      
      .ghostui-toggle-switch.active {{
        background: #1e40af;
      }}
      
      .ghostui-toggle-switch::after {{
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
      }}
      
      .ghostui-toggle-switch.active::after {{
        transform: translateX(20px);
      }}
      
      .ghostui-powered {{
        text-align: center;
        padding: 12px;
        font-size: 11px;
        color: #9ca3af;
        background: #f9fafb;
      }}
      
      .ghostui-powered a {{
        color: #1e40af;
        text-decoration: none;
      }}
    `;
    document.head.appendChild(style);
  }}
  
  // ============================================
  // ACCESSIBILITY WIDGET
  // ============================================
  
  function createWidget() {{
    if (document.querySelector('.ghostui-widget')) return;
    
    const prefs = loadPrefs();
    
    const widget = document.createElement('div');
    widget.className = 'ghostui-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Barrierefreiheits-Einstellungen');
    
    widget.innerHTML = `
      <div class="ghostui-panel" role="dialog" aria-labelledby="ghostui-panel-title">
        <div class="ghostui-panel-header" id="ghostui-panel-title">
          Barrierefreiheit
        </div>
        <div class="ghostui-panel-content">
          <div class="ghostui-toggle">
            <span class="ghostui-toggle-label">Hoher Kontrast</span>
            <div class="ghostui-toggle-switch" data-pref="highContrast" role="switch" aria-checked="false" tabindex="0"></div>
          </div>
          <div class="ghostui-toggle">
            <span class="ghostui-toggle-label">Größerer Text</span>
            <div class="ghostui-toggle-switch" data-pref="largeText" role="switch" aria-checked="false" tabindex="0"></div>
          </div>
          <div class="ghostui-toggle">
            <span class="ghostui-toggle-label">Fokus hervorheben</span>
            <div class="ghostui-toggle-switch" data-pref="enhancedFocus" role="switch" aria-checked="false" tabindex="0"></div>
          </div>
          <div class="ghostui-toggle">
            <span class="ghostui-toggle-label">Lesehilfe</span>
            <div class="ghostui-toggle-switch" data-pref="readingGuide" role="switch" aria-checked="false" tabindex="0"></div>
          </div>
        </div>
        <div class="ghostui-powered">
          Powered by <a href="https://ghostui.xyz" target="_blank" rel="noopener">Ghost-UI</a>
        </div>
      </div>
      <button class="ghostui-widget-btn" aria-label="Barrierefreiheits-Einstellungen öffnen" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="8" r="2"/>
          <path d="M12 10v8"/>
          <path d="M8 14l4 4 4-4"/>
        </svg>
      </button>
    `;
    
    document.body.appendChild(widget);
    
    // Widget button toggle
    const btn = widget.querySelector('.ghostui-widget-btn');
    const panel = widget.querySelector('.ghostui-panel');
    
    btn.addEventListener('click', () => {{
      const isOpen = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
    }});
    
    // Toggle switches
    const switches = widget.querySelectorAll('.ghostui-toggle-switch');
    switches.forEach(sw => {{
      const pref = sw.dataset.pref;
      
      // Apply saved preference
      if (prefs[pref]) {{
        sw.classList.add('active');
        sw.setAttribute('aria-checked', 'true');
        applyPreference(pref, true);
      }}
      
      // Handle click
      sw.addEventListener('click', () => {{
        const isActive = sw.classList.toggle('active');
        sw.setAttribute('aria-checked', isActive);
        applyPreference(pref, isActive);
        
        const newPrefs = loadPrefs();
        newPrefs[pref] = isActive;
        savePrefs(newPrefs);
      }});
      
      // Handle keyboard
      sw.addEventListener('keydown', (e) => {{
        if (e.key === 'Enter' || e.key === ' ') {{
          e.preventDefault();
          sw.click();
        }}
      }});
    }});
    
    // Reading guide mouse follower
    let readingGuide = null;
    document.addEventListener('mousemove', (e) => {{
      if (!readingGuide) return;
      readingGuide.style.top = (e.clientY - 20) + 'px';
    }});
  }}
  
  function applyPreference(pref, active) {{
    switch (pref) {{
      case 'highContrast':
        document.body.classList.toggle('ghostui-high-contrast', active);
        break;
      case 'largeText':
        document.body.classList.toggle('ghostui-large-text', active);
        break;
      case 'enhancedFocus':
        document.body.classList.toggle('ghostui-enhanced-focus', active);
        break;
      case 'readingGuide':
        let guide = document.querySelector('.ghostui-reading-guide');
        if (active && !guide) {{
          guide = document.createElement('div');
          guide.className = 'ghostui-reading-guide';
          document.body.appendChild(guide);
        }} else if (!active && guide) {{
          guide.remove();
        }}
        break;
    }}
  }}
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  function init() {{
    // Inject CSS first
    injectBaseCSS();
    
    // Apply automatic fixes
    applyAltTextFixes();
    applyAriaFixes();
    applyFormFixes();
    applySkipLink();
    applyLangAttr();
    
    // Create widget
    createWidget();
    
    // Log success
    console.log('[Ghost-UI] Accessibility fixes applied. Scan ID:', SCAN_ID);
  }}
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', init);
  }} else {{
    init();
  }}
}})();
'''


# ===========================================
# Webhook Endpoint (for n8n)
# ============================================

@router.post("/webhook/scan", response_model=ApiResponse)
async def webhook_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """
    Webhook endpoint for triggering scans via n8n or other automation tools.
    """
    # Same as regular scan, but could include callback URL in future
    return await start_scan(request, background_tasks)

# ===========================================
# Background Task: Run Scan
# ===========================================

def update_progress(scan_id: str, message: str, percent: int):
    """Helper to update scan progress for frontend display"""
    try:
        supabase = get_supabase()
        supabase.table("compliance_scans").update({
            "progress_message": message,
            "progress_percent": percent
        }).eq("id", scan_id).execute()
        logger.info(f"[{scan_id}] {percent}% - {message}")
    except Exception as e:
        logger.error(f"Error updating progress for scan {scan_id}: {e}")


async def run_scan_task(scan_id: str, url: str, options: ScanOptions):
    """
    Background task to perform the actual scan.
    1. Take screenshot with Playwright and run axe-core
    2. Send screenshot to Gemini Vision for analysis
    3. Merge axe-core + Gemini results
    4. Store results in database
    """
    try:
        # Update status to scanning
        update_scan_field(scan_id, "status", ScanStatus.SCANNING)
        update_progress(scan_id, "Initializing scan...", 5)
        
        # Step 1: Take screenshot and run axe-core with Playwright
        update_progress(scan_id, f"Launching browser for {url}...", 10)
        screenshot_bytes, axe_violations = await take_screenshot_and_run_axe(url, options, scan_id)
        
        if screenshot_bytes is None:
            raise Exception("Failed to capture screenshot - site may be slow or blocking automated access")
        
        axe_count = len(axe_violations)
        update_progress(scan_id, f"Screenshot captured, axe-core found {axe_count} issues", 58)
        
        # Step 2: Analyze with Gemini Vision
        update_progress(scan_id, "Sending to Gemini Vision AI for analysis...", 62)
        gemini_result = await analyze_screenshot(screenshot_bytes, url)
        
        if "error" in gemini_result and gemini_result["error"]:
            error_msg = gemini_result['error']
            if "quota" in error_msg.lower() or "429" in error_msg:
                update_progress(scan_id, "⚠️ Gemini API rate limited - using axe-core results", 75)
            else:
                update_progress(scan_id, f"⚠️ Gemini warning: {error_msg[:50]}...", 75)
        else:
            update_progress(scan_id, "AI analysis complete, merging results...", 80)
        
        # Step 3: Convert and merge issues from both sources
        update_progress(scan_id, "Merging axe-core + Gemini findings...", 85)
        
        # Convert axe-core violations to our format
        axe_issues = convert_axe_to_issues(scan_id, axe_violations)
        
        # Convert Gemini issues to our format
        gemini_issues = convert_gemini_to_issues(scan_id, gemini_result)
        
        # Merge and deduplicate (prefer axe-core for confirmed issues)
        issues = merge_issues(axe_issues, gemini_issues)
        
        # Save issues to database
        save_issues_to_db(scan_id, issues)
        
        logger.info(f"[{scan_id}] Final issue counts: {len(axe_issues)} axe-core, {len(gemini_issues)} Gemini, {len(issues)} merged")
        
        # Calculate counts
        critical = len([i for i in issues if i.severity == IssueSeverity.CRITICAL])
        serious = len([i for i in issues if i.severity == IssueSeverity.SERIOUS])
        moderate = len([i for i in issues if i.severity == IssueSeverity.MODERATE])
        minor = len([i for i in issues if i.severity == IssueSeverity.MINOR])
        total = len(issues)
        
        # Use Gemini's score or calculate our own
        score = gemini_result.get("score", max(0, 100 - (critical * 15 + serious * 10 + moderate * 5 + minor * 2)))
        
        update_progress(scan_id, f"Finalizing report: {total} issues found", 95)
        
        # Update scan record in database
        supabase = get_supabase()
        supabase.table("compliance_scans").update({
            "status": ScanStatus.COMPLETED.value,
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "issue_count": total,
            "critical_count": critical,
            "serious_count": serious,
            "moderate_count": moderate,
            "minor_count": minor,
            "score": score,
        }).eq("id", scan_id).execute()
        
        update_progress(scan_id, f"✅ Scan complete! Score: {score}/100, {total} issues found", 100)
        
        # Deliver webhook for scan.completed
        try:
            from app.api.webhooks.routes import deliver_webhook
            import asyncio
            asyncio.create_task(deliver_webhook("scan.completed", {
                "scan_id": scan_id,
                "url": url,
                "score": score,
                "issue_count": total,
                "critical_count": critical,
                "serious_count": serious,
            }))
            
            # Also deliver webhook for critical issues if any
            if critical > 0:
                asyncio.create_task(deliver_webhook("issue.critical", {
                    "scan_id": scan_id,
                    "url": url,
                    "critical_count": critical,
                }))
        except Exception as webhook_error:
            logger.warning(f"Webhook delivery failed: {webhook_error}")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{scan_id}] Scan failed: {error_msg}")
        try:
            supabase = get_supabase()
            supabase.table("compliance_scans").update({
                "status": ScanStatus.FAILED.value,
                "error_message": error_msg,
            }).eq("id", scan_id).execute()
        except Exception as db_error:
            logger.error(f"Failed to update scan status to failed: {db_error}")
        update_progress(scan_id, f"❌ Scan failed: {error_msg[:100]}", 0)
        
        # Deliver webhook for scan.failed
        try:
            from app.api.webhooks.routes import deliver_webhook
            import asyncio
            asyncio.create_task(deliver_webhook("scan.failed", {
                "scan_id": scan_id,
                "url": url,
                "error": error_msg[:200],
            }))
        except Exception as webhook_error:
            logger.warning(f"Webhook delivery failed: {webhook_error}")


async def take_screenshot_and_run_axe(url: str, options: ScanOptions, scan_id: str = None) -> tuple[Optional[bytes], List[dict]]:
    """
    Take a full-page screenshot and run axe-core accessibility analysis using Playwright.
    Returns tuple of (screenshot_bytes, axe_violations)
    """
    axe_violations = []
    
    try:
        async with async_playwright() as p:
            # Launch headless browser with memory-optimized settings
            if scan_id:
                update_progress(scan_id, "Starting headless browser...", 15)
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-gpu',
                    '--disable-dev-shm-usage',  # Critical for Docker/containers
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--single-process',  # Reduce memory usage
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--no-first-run',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--js-flags=--max-old-space-size=256',  # Limit JS heap
                ]
            )
            
            # Create context with smaller viewport to save memory
            context = await browser.new_context(
                viewport={"width": 1280, "height": 720},
                device_scale_factor=1,
                # Block unnecessary resources to speed up and save memory
                bypass_csp=True,
            )
            
            page = await context.new_page()
            
            # Navigate to URL with timeout (2 min default for slow sites)
            if scan_id:
                update_progress(scan_id, f"Loading page (timeout: {options.timeout // 1000}s)...", 20)
            
            await page.goto(url, wait_until="networkidle", timeout=options.timeout)
            
            if scan_id:
                update_progress(scan_id, "Page loaded successfully!", 35)
            
            # Try to dismiss cookie banners if enabled
            if options.dismissCookieBanner:
                if scan_id:
                    update_progress(scan_id, "Checking for cookie banners...", 40)
                await try_dismiss_cookie_banner(page)
            
            # Wait a bit for any animations
            await asyncio.sleep(1)
            
            # Run axe-core accessibility analysis
            if scan_id:
                update_progress(scan_id, "Running axe-core accessibility analysis...", 45)
            
            try:
                # Inject axe-core from CDN and run analysis
                axe_results = await page.evaluate("""
                    async () => {
                        // Load axe-core from CDN
                        await new Promise((resolve, reject) => {
                            if (window.axe) {
                                resolve();
                                return;
                            }
                            const script = document.createElement('script');
                            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                        
                        // Run axe analysis with WCAG 2.1 AA rules
                        const results = await axe.run(document, {
                            runOnly: {
                                type: 'tag',
                                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
                            }
                        });
                        
                        return results.violations;
                    }
                """)
                axe_violations = axe_results or []
                logger.info(f"axe-core found {len(axe_violations)} violation types")
            except Exception as axe_error:
                logger.warning(f"axe-core analysis failed (continuing with Gemini only): {str(axe_error)}")
                # Continue without axe results - Gemini will still analyze
            
            # Take screenshot with timeout and size limit
            if scan_id:
                update_progress(scan_id, "Capturing screenshot...", 55)
            
            # For very long pages, limit screenshot height to save memory
            if options.fullPage:
                # Get page height
                page_height = await page.evaluate("document.body.scrollHeight")
                max_height = 8000  # Limit to ~8000px to avoid memory issues
                if page_height > max_height:
                    logger.info(f"Page height {page_height}px exceeds limit, capturing viewport only")
                    screenshot = await page.screenshot(
                        full_page=False,
                        type="png",
                        timeout=30000,  # 30s timeout for screenshot
                    )
                else:
                    screenshot = await page.screenshot(
                        full_page=True,
                        type="png",
                        timeout=30000,
                    )
            else:
                screenshot = await page.screenshot(
                    full_page=False,
                    type="png",
                    timeout=30000,
                )
            
            # Always close browser
            await context.close()
            await browser.close()
            return screenshot, axe_violations
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Screenshot failed: {error_msg}")
        if scan_id:
            if "Timeout" in error_msg:
                update_progress(scan_id, f"⏱️ Page took too long to load (>{options.timeout // 1000}s)", 0)
            else:
                update_progress(scan_id, f"❌ Browser error: {error_msg[:80]}", 0)
        return None, []


async def try_dismiss_cookie_banner(page):
    """
    Try to click common cookie banner accept buttons.
    """
    common_selectors = [
        "button:has-text('Accept')",
        "button:has-text('Accept all')",
        "button:has-text('Alle akzeptieren')",
        "button:has-text('Akzeptieren')",
        "[id*='cookie'] button",
        "[class*='cookie'] button",
        "[id*='consent'] button",
    ]
    
    for selector in common_selectors:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=1000):
                await btn.click()
                await asyncio.sleep(0.5)
                return
        except:
            continue


def convert_gemini_to_issues(scan_id: str, gemini_result: dict) -> List[ComplianceIssue]:
    """
    Convert Gemini Vision response to ComplianceIssue objects.
    """
    issues = []
    
    for gemini_issue in gemini_result.get("issues", []):
        # Map severity
        severity_map = {
            "critical": IssueSeverity.CRITICAL,
            "serious": IssueSeverity.SERIOUS,
            "moderate": IssueSeverity.MODERATE,
            "minor": IssueSeverity.MINOR,
        }
        severity = severity_map.get(
            gemini_issue.get("severity", "moderate").lower(),
            IssueSeverity.MODERATE
        )
        
        # Format WCAG criterion
        criterion = gemini_issue.get("criterion", "Unknown")
        level = gemini_issue.get("level", "")
        wcag_criterion = f"{criterion} (Level {level})" if level else criterion
        
        issue = ComplianceIssue(
            id=str(uuid.uuid4()),
            scanId=scan_id,
            severity=severity,
            wcagCriterion=wcag_criterion,
            description=gemini_issue.get("description", "No description provided"),
            location=gemini_issue.get("element"),
            recommendation=gemini_issue.get("suggestion", "No recommendation provided"),
            source=IssueSource.GEMINI,
            confidence=ConfidenceLevel.MEDIUM,  # Gemini results are medium confidence
        )
        issues.append(issue)
    
    return issues


def convert_axe_to_issues(scan_id: str, axe_violations: List[dict]) -> List[ComplianceIssue]:
    """
    Convert axe-core violation results to ComplianceIssue objects.
    axe-core violations have high confidence since they're programmatic.
    """
    issues = []
    
    # Map axe-core impact to our severity
    impact_to_severity = {
        "critical": IssueSeverity.CRITICAL,
        "serious": IssueSeverity.SERIOUS,
        "moderate": IssueSeverity.MODERATE,
        "minor": IssueSeverity.MINOR,
    }
    
    for violation in axe_violations:
        severity = impact_to_severity.get(
            violation.get("impact", "moderate"),
            IssueSeverity.MODERATE
        )
        
        # Get WCAG tags from the violation
        tags = violation.get("tags", [])
        wcag_tags = [t for t in tags if t.startswith("wcag")]
        wcag_criterion = wcag_tags[0] if wcag_tags else violation.get("id", "Unknown")
        
        # Create an issue for each affected node
        nodes = violation.get("nodes", [])
        for node in nodes[:5]:  # Limit to 5 nodes per violation type
            # Get the element selector
            target = node.get("target", [])
            selector = target[0] if target else None
            
            # Get the HTML snippet
            html = node.get("html", "")
            
            issue = ComplianceIssue(
                id=str(uuid.uuid4()),
                scanId=scan_id,
                severity=severity,
                wcagCriterion=wcag_criterion.upper().replace("WCAG", "WCAG "),
                description=violation.get("description", violation.get("help", "Accessibility issue detected")),
                location=selector,
                recommendation=violation.get("helpUrl", "See axe-core documentation for fix guidance"),
                source=IssueSource.AXE_CORE,
                confidence=ConfidenceLevel.HIGH,  # axe-core results are high confidence
                elementHtml=html[:500] if html else None,  # Truncate long HTML
            )
            issues.append(issue)
    
    return issues


def merge_issues(axe_issues: List[ComplianceIssue], gemini_issues: List[ComplianceIssue]) -> List[ComplianceIssue]:
    """
    Merge and deduplicate issues from axe-core and Gemini.
    - axe-core issues take priority (higher confidence)
    - Similar Gemini issues get upgraded to 'both' source
    - Unique Gemini issues are kept with medium confidence
    """
    merged = list(axe_issues)  # Start with all axe issues
    seen_descriptions = set()
    
    # Create a set of normalized descriptions from axe issues for deduplication
    for issue in axe_issues:
        # Normalize: lowercase, remove extra spaces
        normalized = ' '.join(issue.description.lower().split())
        seen_descriptions.add(normalized)
    
    # Add unique Gemini issues
    for gemini_issue in gemini_issues:
        normalized = ' '.join(gemini_issue.description.lower().split())
        
        # Check if this is a duplicate
        is_duplicate = False
        for axe_desc in seen_descriptions:
            # Simple similarity check: if 50% of words match, consider duplicate
            gemini_words = set(normalized.split())
            axe_words = set(axe_desc.split())
            if len(gemini_words) > 0 and len(axe_words) > 0:
                overlap = len(gemini_words & axe_words) / max(len(gemini_words), len(axe_words))
                if overlap > 0.5:
                    is_duplicate = True
                    # Find the matching axe issue and upgrade its source
                    for merged_issue in merged:
                        merged_normalized = ' '.join(merged_issue.description.lower().split())
                        if merged_normalized == axe_desc:
                            merged_issue.source = IssueSource.BOTH
                            merged_issue.confidence = ConfidenceLevel.HIGH
                            break
                    break
        
        if not is_duplicate:
            merged.append(gemini_issue)
            seen_descriptions.add(normalized)
    
    # Sort by severity (critical first) then by source (axe-core/both first)
    severity_order = {
        IssueSeverity.CRITICAL: 0,
        IssueSeverity.SERIOUS: 1,
        IssueSeverity.MODERATE: 2,
        IssueSeverity.MINOR: 3,
    }
    source_order = {
        IssueSource.BOTH: 0,
        IssueSource.AXE_CORE: 1,
        IssueSource.GEMINI: 2,
    }
    
    merged.sort(key=lambda i: (severity_order.get(i.severity, 4), source_order.get(i.source, 3)))
    
    return merged


# ===========================================
# Helper Functions
# ===========================================

def generate_mock_issues(scan_id: str, url: str) -> List[ComplianceIssue]:
    """
    Generate mock issues for demo purposes.
    Replace with real Gemini + axe-core integration.
    """
    return [
        ComplianceIssue(
            id=str(uuid.uuid4()),
            scanId=scan_id,
            severity=IssueSeverity.CRITICAL,
            wcagCriterion="1.4.3 Contrast (Minimum)",
            description="Text has insufficient color contrast ratio of 2.5:1 (required: 4.5:1)",
            location="header > nav > a.nav-link",
            recommendation="Increase the contrast between the text color and background. Consider using #333333 on #FFFFFF for a ratio of 12.6:1.",
            source=IssueSource.BOTH,
            confidence=ConfidenceLevel.HIGH,
            elementHtml='<a class="nav-link" style="color: #999">About</a>',
        ),
        ComplianceIssue(
            id=str(uuid.uuid4()),
            scanId=scan_id,
            severity=IssueSeverity.SERIOUS,
            wcagCriterion="1.1.1 Non-text Content",
            description="Image is missing alt text",
            location="main > section > img.hero-image",
            recommendation="Add descriptive alt text that conveys the meaning and purpose of the image.",
            source=IssueSource.AXE_CORE,
            confidence=ConfidenceLevel.HIGH,
            elementHtml='<img src="hero.jpg" class="hero-image">',
        ),
        ComplianceIssue(
            id=str(uuid.uuid4()),
            scanId=scan_id,
            severity=IssueSeverity.MODERATE,
            wcagCriterion="2.4.4 Link Purpose (In Context)",
            description="Link text 'Click here' is not descriptive",
            location="main > p > a",
            recommendation="Use descriptive link text that indicates the destination, e.g., 'Read our privacy policy'.",
            source=IssueSource.GEMINI,
            confidence=ConfidenceLevel.MEDIUM,
            elementHtml='<a href="/privacy">Click here</a>',
        ),
        ComplianceIssue(
            id=str(uuid.uuid4()),
            scanId=scan_id,
            severity=IssueSeverity.MINOR,
            wcagCriterion="1.3.1 Info and Relationships",
            description="Heading levels are not properly nested (h1 followed by h3)",
            location="main > article",
            recommendation="Ensure heading levels follow a logical sequence without skipping levels.",
            source=IssueSource.AXE_CORE,
            confidence=ConfidenceLevel.HIGH,
        ),
    ]


# Load Bundesländer configuration from JSON file
import json
from pathlib import Path

_BUNDESLAENDER_CONFIG: Optional[dict] = None

def _get_bundeslaender_config() -> dict:
    """Load and cache the Bundesländer configuration."""
    global _BUNDESLAENDER_CONFIG
    if _BUNDESLAENDER_CONFIG is None:
        config_path = Path(__file__).parent.parent.parent / "config" / "bundeslaender.json"
        try:
            _BUNDESLAENDER_CONFIG = json.loads(config_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to load bundeslaender.json: {e}")
            _BUNDESLAENDER_CONFIG = {}
    return _BUNDESLAENDER_CONFIG


def get_schlichtungsstelle(bundesland: Optional[str]) -> str:
    """
    Get Schlichtungsstelle URL based on Bundesland.
    Returns placeholder if not found.
    """
    config = _get_bundeslaender_config()
    bundesland_data = config.get(bundesland or "", {})
    return bundesland_data.get("schlichtungsstelle", "[SCHLICHTUNGSSTELLE LINK EINFÜGEN]")


def get_marktuberwachungsbehoerde(bundesland: Optional[str]) -> str:
    """
    Get Marktüberwachungsbehörde URL based on Bundesland.
    Returns placeholder if not found.
    """
    config = _get_bundeslaender_config()
    bundesland_data = config.get(bundesland or "", {})
    return bundesland_data.get("marktueberwachung", "[MARKTÜBERWACHUNGSBEHÖRDE LINK EINFÜGEN]")


def generate_statement_html(request: StatementRequest, conformance: str, non_accessible: List[str], schlichtungsstelle: str, markt_behoerde: str) -> str:
    """
    Generate HTML accessibility statement with styled formatting.
    """
    conformance_text = {
        "fully": "vollständig konform",
        "partially": "teilweise konform", 
        "not": "nicht konform"
    }
    
    # Build non-accessible content HTML with proper formatting
    non_accessible_html = ""
    if non_accessible:
        non_accessible_html = "<h2>Nicht barrierefreie Inhalte</h2>\n<div class='issues'>\n"
        for item in non_accessible:
            if item.startswith("**") and item.endswith(":**"):
                # Section header
                header = item.replace("**", "").replace(":", "")
                non_accessible_html += f"<h3 class='issue-category'>{header}</h3>\n<ul>\n"
            elif item.startswith("- "):
                # Issue item
                non_accessible_html += f"<li>{item[2:]}</li>\n"
            else:
                non_accessible_html += f"</ul>\n"
        non_accessible_html += "</ul>\n</div>"
    
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Erklärung zur Barrierefreiheit - {request.organizationName}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }}
        h1 {{ color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }}
        h2 {{ color: #1e40af; margin-top: 30px; }}
        h3.issue-category {{ color: #dc2626; font-size: 1em; margin: 20px 0 10px 0; }}
        .issues ul {{ margin: 0 0 15px 20px; }}
        .issues li {{ margin: 5px 0; }}
        a {{ color: #2563eb; }}
        .meta {{ color: #666; font-style: italic; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }}
        @media print {{ body {{ margin: 20px; }} }}
    </style>
</head>
<body>
    <h1>Erklärung zur Barrierefreiheit</h1>
    
    <p><strong>{request.organizationName}</strong> ist bemüht, die Website 
    <a href="{request.websiteUrl}">{request.websiteUrl}</a> 
    im Einklang mit den gesetzlichen Vorgaben barrierefrei zugänglich zu machen.</p>
    
    <h2>Stand der Vereinbarkeit mit den Anforderungen</h2>
    <p>Diese Website ist mit den Anforderungen des Barrierefreiheitsstärkungsgesetzes (BFSG) 
    <strong>{conformance_text[conformance]}</strong>.</p>
    
    {non_accessible_html}
    
    <h2>Feedback und Kontaktangaben</h2>
    <p>Wenn Ihnen Mängel in Bezug auf die barrierefreie Gestaltung auffallen, können Sie uns kontaktieren:</p>
    <ul>
        <li>E-Mail: <a href="mailto:{request.contactEmail}">{request.contactEmail}</a></li>
        {f"<li>Telefon: {request.contactPhone}</li>" if request.contactPhone else ""}
    </ul>
    
    <h2>Schlichtungsverfahren</h2>
    <p>Bei Streitigkeiten können Sie sich an die zuständige Schlichtungsstelle wenden:</p>
    <p><a href="{schlichtungsstelle}">{schlichtungsstelle}</a></p>
    
    <h2>Marktüberwachungsbehörde</h2>
    <p><a href="{markt_behoerde}">{markt_behoerde}</a></p>
    
    <p class="meta">Diese Erklärung wurde am {datetime.utcnow().strftime('%d.%m.%Y')} erstellt.</p>
</body>
</html>"""


def generate_statement_markdown(request: StatementRequest, conformance: str, non_accessible: List[str], schlichtungsstelle: str, markt_behoerde: str) -> str:
    """
    Generate Markdown accessibility statement.
    """
    conformance_text = {
        "fully": "vollständig konform",
        "partially": "teilweise konform",
        "not": "nicht konform"
    }
    
    # Build non-accessible content with proper markdown formatting
    non_accessible_md = ""
    if non_accessible:
        non_accessible_md = "\n## Nicht barrierefreie Inhalte\n\n"
        for item in non_accessible:
            if item.startswith("**") and item.endswith(":**"):
                # Section header - convert to h3
                non_accessible_md += f"\n### {item.replace('**', '').replace(':', '')}\n\n"
            elif item.startswith("- "):
                non_accessible_md += f"{item}\n"
    
    return f"""# Erklärung zur Barrierefreiheit

**{request.organizationName}** ist bemüht, die Website [{request.websiteUrl}]({request.websiteUrl}) im Einklang mit den gesetzlichen Vorgaben barrierefrei zugänglich zu machen.

## Stand der Vereinbarkeit mit den Anforderungen

Diese Website ist mit den Anforderungen des Barrierefreiheitsstärkungsgesetzes (BFSG) **{conformance_text[conformance]}**.
{non_accessible_md}
## Feedback und Kontaktangaben

Wenn Ihnen Mängel in Bezug auf die barrierefreie Gestaltung auffallen, können Sie uns kontaktieren:

- E-Mail: [{request.contactEmail}](mailto:{request.contactEmail})
{f"- Telefon: {request.contactPhone}" if request.contactPhone else ""}

## Schlichtungsverfahren

Bei Streitigkeiten können Sie sich an die zuständige Schlichtungsstelle wenden:

[{schlichtungsstelle}]({schlichtungsstelle})

## Marktüberwachungsbehörde

[{markt_behoerde}]({markt_behoerde})

---

*Diese Erklärung wurde am {datetime.utcnow().strftime('%d.%m.%Y')} erstellt.*
"""
