# 👤 JANNIK: Agents API Routes

from fastapi import APIRouter, HTTPException, Depends, status, Body
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import httpx
from app.database import get_supabase
from app.models.agents import AgentTask, AgentResult, AuditorRunRequest, WCAGIssue
from app.models.auth import User
from app.middleware.auth import get_current_user
from app.services.openai_service import generate_code_fix, analyze_ux
from app.services.gemini_service import analyze_screenshot_base64

router = APIRouter(prefix="/api/agents", tags=["agents"])


# Available agents
AVAILABLE_AGENTS = [
    {
        "type": "auditor",
        "name": "Accessibility Auditor",
        "description": "Scans websites for WCAG accessibility issues using AI vision",
    },
    {
        "type": "fixer",
        "name": "Code Fixer",
        "description": "Generates code fixes for accessibility issues",
    },
    {
        "type": "analyzer",
        "name": "UX Analyzer",
        "description": "Analyzes page UX and provides recommendations",
    },
    {
        "type": "personalizer",
        "name": "Personalizer",
        "description": "Creates personalized accessibility profiles based on user needs",
    },
]


@router.get("/")
async def list_agents():
    """
    List all available AI agents with their descriptions.
    """
    return {"agents": AVAILABLE_AGENTS}


@router.get("/runs")
async def get_agent_runs(
    agent_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """
    Get history of agent runs for the current user.
    """
    try:
        supabase = get_supabase()
        
        query = supabase.table("agent_runs") \
            .select("*") \
            .eq("user_id", current_user.id)
        
        if agent_type:
            query = query.eq("agent_type", agent_type)
        if status_filter:
            query = query.eq("status", status_filter)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return {"runs": result.data or []}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent runs: {str(e)}"
        )


@router.get("/runs/{run_id}")
async def get_agent_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific agent run by ID.
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table("agent_runs") \
            .select("*") \
            .eq("id", run_id) \
            .eq("user_id", current_user.id) \
            .single() \
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent run not found"
            )
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent run: {str(e)}"
        )


async def create_agent_run(
    supabase,
    user_id: str,
    agent_type: str,
    input_data: dict,
) -> dict:
    """Helper to create an agent run record."""
    run_data = {
        "user_id": user_id,
        "agent_type": agent_type,
        "status": "running",
        "input": input_data,
        "started_at": datetime.utcnow().isoformat(),
    }
    
    result = supabase.table("agent_runs").insert(run_data).execute()
    return result.data[0] if result.data else None


async def update_agent_run(
    supabase,
    run_id: str,
    status: str,
    output: dict = None,
    error: str = None,
):
    """Helper to update an agent run record."""
    update_data = {
        "status": status,
        "completed_at": datetime.utcnow().isoformat(),
    }
    
    if output:
        update_data["output"] = output
    if error:
        update_data["error"] = error
    
    supabase.table("agent_runs").update(update_data).eq("id", run_id).execute()


class FixerRunRequest(BaseModel):
    issue_id: Optional[str] = None
    code: Optional[str] = None
    issue_description: Optional[str] = None
    wcag_criterion: Optional[str] = None

@router.post("/fixer/run")
async def run_fixer_agent(
    request: FixerRunRequest = Body(...),
    current_user: User = Depends(get_current_user),
):
    """
    Run the code fixer agent to generate accessibility fixes.
    
    Can provide either:
    - issue_id: ID of an existing compliance issue in the database
    - code + issue_description: Direct code and issue to fix
    """
    supabase = get_supabase()
    
    # Prepare input
    input_data = {
        "issue_id": request.issue_id,
        "code": request.code,
        "issue_description": request.issue_description,
        "wcag_criterion": request.wcag_criterion,
    }
    
    # Create run record
    run = await create_agent_run(supabase, current_user.id, "fixer", input_data)
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create agent run"
        )
    
    try:
        # Get values from request
        issue_id = request.issue_id
        code = request.code
        issue_description = request.issue_description
        wcag_criterion = request.wcag_criterion
        
        # If issue_id provided, fetch issue from DB
        if issue_id:
            issue_result = supabase.table("compliance_issues") \
                .select("*") \
                .eq("id", issue_id) \
                .single() \
                .execute()
            
            if issue_result.data:
                issue_description = issue_result.data.get("description", "")
                wcag_criterion = issue_result.data.get("wcag_criterion", "")
        
        # Build issue dict
        issue = {
            "description": issue_description or "Accessibility issue",
            "wcag_criterion": wcag_criterion or "Unknown",
            "element_selector": input_data.get("element_selector"),
        }
        
        # Generate fix
        result = await generate_code_fix(issue, code or "")
        
        # Update run with result
        await update_agent_run(supabase, run["id"], "completed", output=result)
        
        return {
            "run_id": run["id"],
            "status": "completed",
            "result": result,
        }
        
    except Exception as e:
        await update_agent_run(supabase, run["id"], "failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


class AnalyzerRunRequest(BaseModel):
    url: str

@router.post("/analyzer/run")
async def run_analyzer_agent(
    request: AnalyzerRunRequest = Body(...),
    current_user: User = Depends(get_current_user),
):
    """
    Run the UX analyzer agent on a URL.
    Fetches the page and analyzes its UX and accessibility.
    """
    supabase = get_supabase()
    url = request.url
    
    # Create run record
    input_data = {"url": url}
    run = await create_agent_run(supabase, current_user.id, "analyzer", input_data)
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create agent run"
        )
    
    try:
        # Fetch the page HTML
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=30.0)
            html_content = response.text
        
        # Analyze the page
        result = await analyze_ux(url, html_content)
        
        # Update run with result
        await update_agent_run(supabase, run["id"], "completed", output=result)
        
        return {
            "run_id": run["id"],
            "status": "completed",
            "result": result,
        }
        
    except httpx.RequestError as e:
        error_msg = f"Failed to fetch URL: {str(e)}"
        await update_agent_run(supabase, run["id"], "failed", error=error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        await update_agent_run(supabase, run["id"], "failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


@router.post("/auditor/run")
async def run_auditor_agent(
    request: AuditorRunRequest = Body(...),
    current_user: User = Depends(get_current_user),
):
    """
    Run the accessibility auditor agent using Gemini Vision.
    
    Accepts either:
    - url: URL to analyze (basic HTML analysis via analyzer)
    - url + screenshot: Full visual analysis via Gemini Vision
    
    The screenshot should be a base64-encoded PNG/JPEG image.
    """
    supabase = get_supabase()
    
    input_data = {
        "url": request.url,
        "has_screenshot": request.screenshot is not None,
    }
    
    # Create run record
    run = await create_agent_run(supabase, current_user.id, "auditor", input_data)
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create agent run"
        )
    
    try:
        if request.screenshot:
            # Full visual analysis with Gemini Vision
            result = await analyze_screenshot_base64(request.screenshot, request.url)
            
            # Check for errors
            if result.get("error"):
                await update_agent_run(supabase, run["id"], "failed", error=result["error"])
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result["error"]
                )
            
            # Format response
            output = {
                "url": result.get("url", request.url),
                "score": result.get("score", 0),
                "passed_checks": result.get("passed_checks", 0),
                "total_checks": result.get("total_checks", 0),
                "issues": result.get("issues", []),
                "recommendations": result.get("recommendations", []),
                "analysis_type": "gemini_vision",
            }
            
            await update_agent_run(supabase, run["id"], "completed", output=output)
            
            return {
                "run_id": run["id"],
                "status": "completed",
                "result": output,
            }
        else:
            # Fallback to basic HTML analysis (via analyzer)
            # Fetch the page HTML
            async with httpx.AsyncClient() as client:
                response = await client.get(request.url, follow_redirects=True, timeout=30.0)
                html_content = response.text
            
            # Use OpenAI analyzer for basic analysis
            result = await analyze_ux(request.url, html_content)
            
            output = {
                "url": request.url,
                "score": result.get("score", 50),
                "passed_checks": 0,
                "total_checks": 0,
                "issues": result.get("issues", []),
                "recommendations": result.get("recommendations", []),
                "wcag_notes": result.get("wcag_notes", ""),
                "analysis_type": "html_only",
            }
            
            await update_agent_run(supabase, run["id"], "completed", output=output)
            
            return {
                "run_id": run["id"],
                "status": "completed",
                "result": output,
            }
            
    except httpx.RequestError as e:
        error_msg = f"Failed to fetch URL: {str(e)}"
        await update_agent_run(supabase, run["id"], "failed", error=error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except HTTPException:
        raise
    except Exception as e:
        await update_agent_run(supabase, run["id"], "failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


@router.post("/personalizer/run")
async def run_personalizer_agent(
    user_needs: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Run the personalizer agent to create accessibility profiles.
    """
    supabase = get_supabase()
    
    input_data = {"user_needs": user_needs}
    run = await create_agent_run(supabase, current_user.id, "personalizer", input_data)
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create agent run"
        )
    
    try:
        # Generate personalized preferences based on needs
        # This is a simplified implementation
        preferences = {
            "highContrast": user_needs.get("low_vision", False),
            "fontSize": 20 if user_needs.get("low_vision", False) else 16,
            "dyslexiaFont": user_needs.get("dyslexia", False),
            "focusMode": user_needs.get("adhd", False) or user_needs.get("focus_issues", False),
            "reducedMotion": user_needs.get("motion_sensitivity", False),
            "customCSS": "",
        }
        
        result = {
            "preferences": preferences,
            "reasoning": "Preferences generated based on stated accessibility needs",
        }
        
        await update_agent_run(supabase, run["id"], "completed", output=result)
        
        return {
            "run_id": run["id"],
            "status": "completed",
            "result": result,
        }
        
    except Exception as e:
        await update_agent_run(supabase, run["id"], "failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )
