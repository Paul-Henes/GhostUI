# Ghost-UI Backend

FastAPI backend powering the Ghost-UI accessibility platform. Provides AI-powered WCAG compliance scanning, automatic fix generation, and analytics tracking.

## Core Technologies

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.109+ | Async web framework |
| Playwright | 1.40+ | Headless browser for screenshots |
| Pydantic | 2.x | Request/response validation |
| supabase-py | 2.x | Database & auth client |
| google-generativeai | 0.3+ | Gemini Vision API |
| openai | 1.x | GPT-4 for code fixes |
| WeasyPrint | 60+ | PDF report generation |
| httpx | 0.26+ | Async HTTP client |

---

## Scanner Architecture

### How Compliance Scanning Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Scan Pipeline (async)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. POST /api/compliance/scan                                   │
│     └─► Create scan record (status: pending)                    │
│     └─► Return scan_id immediately                              │
│     └─► Spawn background task                                   │
│                                                                  │
│  2. Background: run_compliance_scan()                           │
│     └─► Update status: scanning                                 │
│     └─► Launch Playwright Chromium (headless)                   │
│     └─► Navigate to URL with timeout                            │
│     └─► Dismiss cookie banners (heuristic)                      │
│     └─► Inject axe-core via CDN                                 │
│     └─► Run axe.run() → violations[]                            │
│     └─► Capture full-page screenshot (max 8000px height)        │
│                                                                  │
│  3. AI Analysis                                                  │
│     └─► Send screenshot to Gemini Vision                        │
│     └─► Parse JSON response (score, issues)                     │
│     └─► Merge axe-core + Gemini issues                          │
│     └─► Deduplicate by selector/location                        │
│                                                                  │
│  4. Store Results                                                │
│     └─► Update scan record (status: completed, score)           │
│     └─► Insert issues to compliance_issues table                │
│     └─► Trigger webhooks (scan.completed event)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gemini Vision Integration

**File**: `app/services/gemini_service.py`

**Model**: `gemini-2.0-flash`

**Prompt Structure**:
```python
WCAG_AUDIT_PROMPT = """You are an expert WCAG 2.1 Level AA accessibility auditor...

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
...

Respond ONLY with valid JSON:
{
    "score": <number 0-100>,
    "issues": [
        {
            "criterion": "1.4.3",
            "level": "AA",
            "severity": "serious",
            "description": "...",
            "element": "...",
            "suggestion": "..."
        }
    ]
}"""
```

### axe-core Integration

Injected at runtime via Playwright:

```javascript
// Injected into page
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js';
document.head.appendChild(script);

// Run analysis
const results = await axe.run();
return results.violations;
```

**Mapping axe-core to WCAG**:
- `violations[].id` → WCAG criterion
- `violations[].impact` → severity (critical/serious/moderate/minor)
- `violations[].nodes[].html` → element context

---

## API Endpoints

### Compliance Scanner

```
POST /api/compliance/scan
  Body: { "url": "https://example.com" }
  Auth: Optional (saves to user account if authenticated)
  Returns: { "scan_id": "uuid", "status": "pending" }

GET /api/compliance/scan/{scan_id}
  Returns: {
    "id": "uuid",
    "url": "https://example.com",
    "status": "completed",
    "score": 72,
    "issue_count": 15,
    "critical_count": 2,
    "serious_count": 5,
    "created_at": "2026-01-31T..."
  }

GET /api/compliance/scan/{scan_id}/issues
  Query: ?severity=critical&page=1&pageSize=20
  Returns: {
    "issues": [...],
    "total": 15,
    "page": 1,
    "pageSize": 20
  }

GET /api/compliance/scans
  Auth: Required
  Query: ?page=1&pageSize=20
  Returns: { "scans": [...], "total": 5 }
```

### Report Generation

```
POST /api/compliance/audit
  Body: { "scan_id": "uuid" }
  Returns: {
    "html_url": "https://...",
    "pdf_url": "https://..."
  }

POST /api/compliance/statement
  Body: {
    "scan_id": "uuid",
    "organization_name": "Acme GmbH",
    "contact_email": "a11y@acme.de",
    "website_url": "https://acme.de"
  }
  Returns: { "html": "...", "pdf_url": "..." }
```

### AI Agents

```
POST /api/agents/fixer/run
  Body: {
    "code": "<button class='btn'></button>",
    "issue_description": "Button has no accessible name",
    "wcag_criterion": "4.1.2"
  }
  Returns: {
    "fixed_code": "<button class='btn' aria-label='Submit form'>Submit</button>",
    "explanation": "Added aria-label attribute...",
    "changes": ["Added aria-label attribute"]
  }

POST /api/agents/auditor/run
  Body: { "screenshot_base64": "iVBORw0KGgo..." }
  Returns: { "score": 75, "issues": [...] }

POST /api/agents/analyzer/run
  Body: { "site_id": "uuid" }
  Returns: { "insights": [...], "recommendations": [...] }
```

### Tracking & Analytics

```
POST /api/tracking/event
  Query: ?site_id=uuid
  Body: {
    "type": "pageview",
    "url": "https://example.com/page",
    "session_id": "abc123"
  }
  Returns: { "success": true, "event_id": "uuid" }

GET /api/tracking/analytics
  Query: ?site_id=uuid&date_from=2026-01-01
  Returns: {
    "pageviews": 1234,
    "sessions": 456,
    "events_by_type": {...}
  }
```

### Webhooks (n8n Integration)

```
GET /api/webhooks
  Auth: Required
  Returns: { "webhooks": [...] }

POST /api/webhooks
  Auth: Required
  Body: {
    "url": "https://n8n.example.com/webhook/abc",
    "event": "scan.completed",
    "site_id": "uuid"  // optional filter
  }
  Returns: { "id": "uuid", "url": "...", "event": "..." }

DELETE /api/webhooks/{id}
  Auth: Required
  Returns: { "deleted": "uuid" }
```

### Unified Script Endpoint

```
GET /ghostui.js?site_id=uuid&scan_id=uuid
  Returns: JavaScript file containing:
  - Analytics tracking code
  - Accessibility fixes from scan
  - Interactive widget
```

---

## Unified Script (`/ghostui.js`)

**File**: `main.py` (lines 89-560)

The script is dynamically generated with:

### 1. Analytics Tracking
```javascript
function trackEvent(eventType, eventData) {
  const payload = {
    type: eventType,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    session_id: sessionId,
    ...eventData
  };
  navigator.sendBeacon(API_URL + '/api/tracking/event?site_id=' + SITE_ID, 
    new Blob([JSON.stringify(payload)], { type: 'text/plain' }));
}

// Auto-track pageview, clicks, scroll depth
trackEvent('pageview', { referrer: document.referrer });
```

### 2. Accessibility Fixes
```javascript
const FIXES = {
  altText: [{ selector: 'img.hero', suggestedAlt: 'Hero image' }],
  ariaLabels: [{ selector: 'button.menu', label: 'Open menu' }],
  formLabels: [...],
  skipLink: true,
  langAttr: 'de'
};

function applyAltTextFixes() {
  FIXES.altText.forEach(fix => {
    document.querySelectorAll(fix.selector).forEach(el => {
      if (!el.hasAttribute('alt')) {
        el.setAttribute('alt', fix.suggestedAlt);
      }
    });
  });
}
```

### 3. Widget UI
```javascript
function createWidget() {
  const widget = document.createElement('div');
  widget.className = 'ghostui-widget';
  widget.innerHTML = `
    <div class="ghostui-panel">
      <div class="ghostui-toggle">High Contrast</div>
      <div class="ghostui-toggle">Dyslexia Font</div>
      <div class="ghostui-slider">Font Size</div>
    </div>
    <button class="ghostui-fab">👻</button>
  `;
  document.body.appendChild(widget);
}
```

---

## Report Generation

### BFSG Audit Report

**Template**: `app/templates/audit_report.html`

**Features**:
- Score visualization with color coding
- Issues grouped by severity
- German translations for WCAG criteria
- PDF generation via WeasyPrint

**Translation System** (`app/services/report_service.py`):
```python
ISSUE_TRANSLATIONS = {
    r"image.*missing.*alt": "Bild ohne Alternativtext",
    r"link.*empty": "Link ohne Text oder zugänglichen Namen",
    r"contrast.*insufficient": "Unzureichender Farbkontrast",
    ...
}
```

---

## Project Structure

```
backend/
├── main.py                      # FastAPI app, routes, /ghostui.js
├── Dockerfile                   # Docker config for Render
├── requirements.txt             # Python dependencies
├── runtime.txt                  # Python version (3.11)
│
├── app/
│   ├── config.py                # Environment variables
│   ├── database.py              # Supabase client
│   │
│   ├── api/
│   │   ├── compliance/
│   │   │   └── routes.py        # Scanner endpoints (2000+ lines)
│   │   ├── agents/
│   │   │   └── routes.py        # AI agent endpoints
│   │   ├── tracking/
│   │   │   └── routes.py        # Analytics endpoints
│   │   ├── webhooks/
│   │   │   └── routes.py        # n8n webhook endpoints
│   │   ├── auth/
│   │   │   └── routes.py        # Authentication
│   │   └── preferences/
│   │       └── routes.py        # User preferences
│   │
│   ├── middleware/
│   │   └── auth.py              # JWT + API key validation
│   │
│   ├── services/
│   │   ├── gemini_service.py    # Gemini Vision API (212 lines)
│   │   ├── openai_service.py    # GPT-4 code fixer
│   │   ├── report_service.py    # PDF/HTML generation (470 lines)
│   │   └── n8n_service.py       # Webhook delivery
│   │
│   └── templates/
│       └── audit_report.html    # Jinja2 template (420 lines)
│
└── static/
    └── tracking.js              # Standalone tracking script
```

---

## Deployment

### Render Configuration

**Runtime**: Docker

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

# System deps for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Environment Variables**:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
BACKEND_PUBLIC_URL=https://ghostui.onrender.com
```

**Health Check**: `GET /health`

---

## Local Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Run development server
uvicorn main:app --reload --port 8000

# API docs available at:
# http://localhost:8000/docs (Swagger)
# http://localhost:8000/redoc (ReDoc)
```

---

## Error Handling

### Scan Failures

```python
try:
    # Scan logic...
except PlaywrightError as e:
    if "timeout" in str(e).lower():
        scan.status = ScanStatus.TIMEOUT
    else:
        scan.status = ScanStatus.FAILED
        scan.error_message = str(e)
```

### Gemini Rate Limiting

```python
if "rate limit" in error.lower():
    # Continue with axe-core only
    gemini_result = {"score": None, "issues": []}
```

### API Error Responses

```json
{
  "success": false,
  "error": "Scan not found",
  "detail": "No scan exists with ID: abc-123"
}
```
