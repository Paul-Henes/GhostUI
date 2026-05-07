# 👤 JANNIK: OpenAI GPT-4 Service
# Used for code fix generation and UX analysis

from openai import OpenAI
from typing import Optional
from app.config import settings

# Initialize client (lazy)
_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    """Get or create OpenAI client"""
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not configured")
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def generate_code_fix(issue: dict, original_code: str) -> dict:
    """
    Generate an accessibility code fix for an issue.
    
    Args:
        issue: Dict with wcag_criterion, description, element_selector
        original_code: The original HTML/CSS/JS code to fix
        
    Returns:
        Dict with fixed_code, explanation, and changes
    """
    client = get_client()
    
    prompt = f"""You are an accessibility expert. Fix the following code to resolve the WCAG accessibility issue.

Issue Details:
- WCAG Criterion: {issue.get('wcag_criterion', 'Unknown')}
- Description: {issue.get('description', 'No description')}
- Element Selector: {issue.get('element_selector', 'Unknown')}

Original Code:
```html
{original_code}
```

Please provide:
1. The fixed code
2. A brief explanation of what was changed
3. Any additional recommendations

Format your response as JSON with keys: fixed_code, explanation, changes (array of strings)"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an accessibility expert. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        
        content = response.choices[0].message.content
        
        # Try to parse as JSON
        import json
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # If not valid JSON, wrap the response
            result = {
                "fixed_code": content,
                "explanation": "Generated fix",
                "changes": []
            }
        
        return result
        
    except Exception as e:
        return {
            "error": str(e),
            "fixed_code": None,
            "explanation": f"Failed to generate fix: {str(e)}",
            "changes": []
        }


async def analyze_ux(url: str, html_content: str) -> dict:
    """
    Analyze a page's UX and provide recommendations.
    
    Args:
        url: The URL of the page
        html_content: The HTML content to analyze
        
    Returns:
        Dict with score, issues, and recommendations
    """
    client = get_client()
    
    # Truncate HTML if too long
    if len(html_content) > 10000:
        html_content = html_content[:10000] + "\n... [truncated]"
    
    prompt = f"""Analyze the following webpage for UX and accessibility issues.

URL: {url}

HTML Content:
```html
{html_content}
```

Please analyze and provide:
1. Overall UX score (1-100)
2. List of issues found (with severity: critical, serious, moderate, minor)
3. Specific recommendations for improvement
4. WCAG compliance observations

Format your response as JSON with keys: score (number), issues (array of objects with title, severity, description), recommendations (array of strings), wcag_notes (string)"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a UX and accessibility expert. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        
        content = response.choices[0].message.content
        
        # Try to parse as JSON
        import json
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # If not valid JSON, provide a basic structure
            result = {
                "score": 50,
                "issues": [],
                "recommendations": [content],
                "wcag_notes": "Unable to parse analysis"
            }
        
        return result
        
    except Exception as e:
        return {
            "error": str(e),
            "score": 0,
            "issues": [],
            "recommendations": [],
            "wcag_notes": f"Analysis failed: {str(e)}"
        }


async def generate_audit_report(scan_results: dict) -> str:
    """
    Generate a human-readable accessibility audit report.
    
    Args:
        scan_results: Dict with URL, issues found, etc.
        
    Returns:
        Markdown-formatted audit report
    """
    client = get_client()
    
    prompt = f"""Generate a professional accessibility audit report based on the following scan results:

Scan Results:
{scan_results}

Create a comprehensive report in Markdown format including:
1. Executive Summary
2. Overall Compliance Score
3. Critical Issues (if any)
4. Detailed Findings by WCAG Principle
5. Recommendations for Remediation
6. Next Steps

Make the report professional and actionable."""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an accessibility compliance expert writing professional audit reports."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"# Audit Report Generation Failed\n\nError: {str(e)}"
