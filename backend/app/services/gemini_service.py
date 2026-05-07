# Gemini Vision API Service
# 👤 JANNIK: Used for screenshot analysis and accessibility scanning

import base64
import json
from typing import Optional
import google.generativeai as genai
from app.config import settings

# Lazy-loaded model instance
_model: Optional[genai.GenerativeModel] = None


def get_model() -> genai.GenerativeModel:
    """Get or create Gemini model instance"""
    global _model
    
    if _model is None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("Gemini API key not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel('gemini-2.0-flash')
    
    return _model


WCAG_AUDIT_PROMPT = """You are an expert WCAG 2.1 Level AA accessibility auditor with 10+ years experience.

Analyze this screenshot systematically:

1. VISUAL HIERARCHY & CONTRAST
   - Check color contrast ratios (WCAG 1.4.3: min 4.5:1 for text)
   - Identify low-contrast text/buttons
   - Check focus indicators visibility

2. INTERACTIVE ELEMENTS
   - Buttons: size (min 44x44px), labels, keyboard access
   - Forms: labels, error messages, required fields
   - Links: distinguishable from text, descriptive

3. CONTENT STRUCTURE
   - Heading hierarchy (h1 → h2 → h3)
   - Alt text for images
   - Semantic HTML usage

4. NAVIGATION & KEYBOARD
   - Skip links present?
   - Logical tab order
   - Keyboard traps

5. MOBILE & RESPONSIVE
   - Touch target sizes
   - Zoom functionality
   - Orientation support

For EACH issue found:
- criterion: exact WCAG code (e.g., "1.4.3")
- level: "A", "AA", or "AAA"
- severity: "critical" (blocks access), "serious" (major barrier), "moderate" (inconvenience), "minor" (best practice)
- description: specific, actionable (e.g., "Submit button has contrast ratio of 2.8:1, needs 4.5:1")
- element: precise location (e.g., "Blue 'Submit' button in footer")
- suggestion: concrete fix (e.g., "Change button color to #0056b3 for 4.6:1 contrast")

Scoring:
- 90-100: Excellent (0-2 minor issues)
- 70-89: Good (few moderate issues)
- 50-69: Fair (several serious issues)
- 0-49: Poor (critical issues present)

Respond ONLY with valid JSON:
{
    "score": <number 0-100>,
    "passed_checks": <number>,
    "total_checks": <number>,
    "issues": [
        {
            "criterion": "1.4.3",
            "level": "AA",
            "severity": "serious",
            "description": "...",
            "element": "...",
            "suggestion": "..."
        }
    ],
    "recommendations": ["Top 3 priority fixes"]
}"""


async def analyze_screenshot(image_data: bytes, url: str = "") -> dict:
    """
    Analyze a screenshot for WCAG accessibility issues using Gemini Vision.
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        url: Optional URL of the page being analyzed
        
    Returns:
        Dict with score, issues, recommendations
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        model = get_model()
        logger.info(f"[Gemini] Analyzing screenshot for {url}, image size: {len(image_data)} bytes")
        
        # Encode image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Create the prompt with context
        prompt = WCAG_AUDIT_PROMPT
        if url:
            prompt = f"URL being analyzed: {url}\n\n{prompt}"
        
        # Create image part for Gemini using PIL-compatible format
        image_part = {
            "mime_type": "image/png",
            "data": image_base64
        }
        
        logger.info(f"[Gemini] Sending to Gemini Vision API...")
        
        # Generate response
        response = model.generate_content([prompt, image_part])
        
        logger.info(f"[Gemini] Response received, parsing...")
        
        # Parse the JSON response
        response_text = response.text.strip()
        logger.info(f"[Gemini] Raw response (first 500 chars): {response_text[:500]}")
        
        # Handle markdown code blocks if present
        if response_text.startswith("```"):
            # Remove markdown code block markers
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        result = json.loads(response_text)
        logger.info(f"[Gemini] Parsed result: score={result.get('score')}, issues={len(result.get('issues', []))}")
        
        # Validate and ensure required fields
        return {
            "url": url,
            "score": result.get("score", 50),
            "passed_checks": result.get("passed_checks", 0),
            "total_checks": result.get("total_checks", 0),
            "issues": result.get("issues", []),
            "recommendations": result.get("recommendations", []),
        }
        
    except json.JSONDecodeError as e:
        return {
            "url": url,
            "score": 0,
            "passed_checks": 0,
            "total_checks": 0,
            "issues": [],
            "recommendations": [],
            "error": f"Failed to parse Gemini response: {str(e)}",
            "raw_response": response_text if 'response_text' in locals() else None,
        }
        
    except ValueError as e:
        # API key not configured
        return {
            "url": url,
            "score": 0,
            "passed_checks": 0,
            "total_checks": 0,
            "issues": [],
            "recommendations": [],
            "error": str(e),
        }
        
    except Exception as e:
        return {
            "url": url,
            "score": 0,
            "passed_checks": 0,
            "total_checks": 0,
            "issues": [],
            "recommendations": [],
            "error": f"Gemini analysis failed: {str(e)}",
        }


async def analyze_screenshot_base64(image_base64: str, url: str = "") -> dict:
    """
    Convenience function to analyze a base64-encoded screenshot.
    
    Args:
        image_base64: Base64-encoded image string
        url: Optional URL of the page being analyzed
        
    Returns:
        Dict with score, issues, recommendations
    """
    try:
        image_data = base64.b64decode(image_base64)
        return await analyze_screenshot(image_data, url)
    except Exception as e:
        return {
            "url": url,
            "score": 0,
            "passed_checks": 0,
            "total_checks": 0,
            "issues": [],
            "recommendations": [],
            "error": f"Failed to decode base64 image: {str(e)}",
        }
