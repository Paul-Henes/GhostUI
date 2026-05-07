# n8n Webhook Service
# Trigger n8n workflows for automation

from app.config import settings
import httpx
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

# Default timeout for webhook calls (in seconds)
DEFAULT_TIMEOUT = 30.0

# Maximum retries for failed requests
MAX_RETRIES = 3


class N8nServiceError(Exception):
    """Custom exception for n8n service errors"""
    pass


async def trigger_workflow(
    workflow_name: str,
    data: dict,
    timeout: float = DEFAULT_TIMEOUT,
    retries: int = MAX_RETRIES
) -> dict[str, Any]:
    """
    Trigger an n8n workflow via webhook.
    
    Args:
        workflow_name: The name/path of the workflow webhook endpoint
        data: The payload to send to the workflow
        timeout: Request timeout in seconds
        retries: Number of retry attempts on failure
    
    Returns:
        The JSON response from n8n
        
    Raises:
        N8nServiceError: If the webhook URL is not configured or the request fails
    """
    if not settings.N8N_WEBHOOK_URL:
        raise N8nServiceError("N8N_WEBHOOK_URL is not configured")
    
    webhook_url = f"{settings.N8N_WEBHOOK_URL.rstrip('/')}/{workflow_name}"
    last_error: Optional[Exception] = None
    
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    webhook_url,
                    json=data,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "GhostUI-Backend/1.0"
                    }
                )
                
                # Check for HTTP errors
                response.raise_for_status()
                
                logger.info(f"Successfully triggered n8n workflow: {workflow_name}")
                return response.json()
                
        except httpx.TimeoutException as e:
            last_error = e
            logger.warning(f"Timeout triggering workflow {workflow_name} (attempt {attempt + 1}/{retries})")
            
        except httpx.HTTPStatusError as e:
            last_error = e
            logger.error(f"HTTP error triggering workflow {workflow_name}: {e.response.status_code}")
            # Don't retry on client errors (4xx)
            if 400 <= e.response.status_code < 500:
                raise N8nServiceError(f"n8n webhook returned error: {e.response.status_code}")
                
        except httpx.RequestError as e:
            last_error = e
            logger.warning(f"Request error triggering workflow {workflow_name} (attempt {attempt + 1}/{retries}): {e}")
        
        except Exception as e:
            last_error = e
            logger.error(f"Unexpected error triggering workflow {workflow_name}: {e}")
            raise N8nServiceError(f"Failed to trigger workflow: {e}")
    
    # All retries exhausted
    raise N8nServiceError(f"Failed to trigger workflow after {retries} attempts: {last_error}")


async def trigger_compliance_workflow(scan_id: str, url: str, user_id: Optional[str] = None) -> dict:
    """
    Trigger the compliance scan workflow in n8n.
    
    Args:
        scan_id: The ID of the compliance scan
        url: The URL being scanned
        user_id: Optional user ID for tracking
        
    Returns:
        The workflow response
    """
    return await trigger_workflow("compliance-scan", {
        "scanId": scan_id,
        "url": url,
        "userId": user_id,
        "timestamp": None  # Will be set by n8n
    })


async def trigger_notification_workflow(
    event_type: str,
    recipient_email: str,
    data: dict
) -> dict:
    """
    Trigger a notification workflow in n8n.
    
    Args:
        event_type: Type of notification (e.g., "scan_complete", "issue_found")
        recipient_email: Email address to notify
        data: Additional data for the notification
        
    Returns:
        The workflow response
    """
    return await trigger_workflow("notifications", {
        "eventType": event_type,
        "recipientEmail": recipient_email,
        "data": data
    })


async def ping_n8n() -> bool:
    """
    Check if n8n is reachable.
    
    Returns:
        True if n8n responds, False otherwise
    """
    if not settings.N8N_WEBHOOK_URL:
        return False
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try to reach the base URL
            response = await client.get(settings.N8N_WEBHOOK_URL.rstrip('/'))
            return response.status_code < 500
    except Exception:
        return False
