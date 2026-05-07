# n8n-nodes-ghostui

[![npm version](https://img.shields.io/npm/v/n8n-nodes-ghostui)](https://www.npmjs.com/package/n8n-nodes-ghostui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

n8n community node for [Ghost-UI](https://ghostui.xyz) — the AI-powered accessibility compliance platform.

Automate WCAG scanning, issue management, and accessibility workflows directly in n8n.

---

## Features

### Ghost-UI Node (Actions)

| Resource | Operations |
|----------|------------|
| **Compliance Scan** | Start Scan, Get Status, Wait for Completion, Get Fix Script |
| **Issue** | Get All Issues, Get Issue Details |
| **Report** | Generate Audit Report, Generate BFSG Statement |
| **AI Agent** | Run Auditor (Gemini), Run Analyzer, Run Fixer (GPT-4) |
| **Analytics** | Get Analytics Data |

### Ghost-UI Trigger (Events)

| Event | Description | Payload |
|-------|-------------|---------|
| `scan.completed` | Scan finished successfully | `{scan_id, url, score, issue_count, critical_count}` |
| `scan.failed` | Scan encountered error | `{scan_id, url, error}` |
| `issue.critical` | Critical issues found | `{scan_id, url, critical_count}` |
| `tracking.preference` | User changed a11y preference | `{site_id, preference, enabled, value}` |
| `*` | All events (wildcard) | Varies by event type |

---

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-ghostui` and confirm

### Manual Installation

```bash
cd ~/.n8n
npm install n8n-nodes-ghostui
# Restart n8n
```

---

## Credentials Setup

### 1. Get API Key from Ghost-UI

1. Sign up at [ghostui.xyz](https://ghostui.xyz)
2. Go to **Settings > API Keys**
3. Click **Generate API Key**
4. Copy the key (starts with `ghostui_`)

### 2. Configure in n8n

1. Create new credentials: **Ghost-UI API**
2. Enter your API key
3. Optionally change Base URL (default: `https://ghostui.onrender.com`)

---

## Node Reference

### Compliance Scan Operations

#### Start Scan

Initiates a new WCAG accessibility scan.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| URL | string | Yes | Website URL to scan |

**Output:**
```json
{
  "scan_id": "a1b2c3d4-...",
  "status": "pending",
  "url": "https://example.com"
}
```

#### Get Scan Status

Retrieves current status and results of a scan.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Scan ID | string | Yes | ID from Start Scan |

**Output:**
```json
{
  "id": "a1b2c3d4-...",
  "url": "https://example.com",
  "status": "completed",
  "score": 72,
  "issue_count": 15,
  "critical_count": 2,
  "serious_count": 5,
  "moderate_count": 6,
  "minor_count": 2,
  "created_at": "2026-01-31T10:30:00Z",
  "completed_at": "2026-01-31T10:31:15Z"
}
```

#### Wait for Completion

Polls until scan completes or times out.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| Scan ID | string | Yes | - | ID from Start Scan |
| Timeout | number | No | 120 | Max seconds to wait |
| Poll Interval | number | No | 5 | Seconds between checks |

#### Get Fix Script URL

Returns the one-click fix embed code.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Scan ID | string | Yes | ID of completed scan |
| Site ID | string | Yes | Your tracking site ID |

**Output:**
```json
{
  "script_url": "https://ghostui.onrender.com/ghostui.js?site_id=xxx&scan_id=yyy",
  "embed_code": "<script src=\"https://ghostui.onrender.com/ghostui.js?site_id=xxx&scan_id=yyy\"></script>"
}
```

---

### Issue Operations

#### Get All Issues

Lists accessibility issues from a scan.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| Scan ID | string | Yes | - | ID of completed scan |
| Severity | options | No | All | Filter: critical/serious/moderate/minor |
| Page | number | No | 1 | Page number |
| Page Size | number | No | 50 | Items per page |

**Output:**
```json
{
  "issues": [
    {
      "id": "issue-uuid",
      "severity": "critical",
      "wcag_criterion": "1.1.1",
      "description": "Image missing alt text",
      "location": "img.hero-image",
      "element_html": "<img src=\"hero.jpg\" class=\"hero-image\">",
      "recommendation": "Add descriptive alt text"
    }
  ],
  "total": 15,
  "page": 1
}
```

---

### Report Operations

#### Generate Audit Report

Creates a PDF accessibility audit report.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Scan ID | string | Yes | ID of completed scan |

**Output:**
```json
{
  "html_url": "https://xxx.supabase.co/storage/v1/object/public/reports/audits/scan-id.html",
  "pdf_url": "https://xxx.supabase.co/storage/v1/object/public/reports/audits/scan-id.pdf"
}
```

#### Generate BFSG Statement

Creates a German accessibility statement.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Scan ID | string | Yes | ID of completed scan |
| Organization Name | string | Yes | Company name |
| Contact Email | string | Yes | Accessibility contact |
| Contact Phone | string | No | Phone number |
| Website URL | string | Yes | Website being documented |

---

### AI Agent Operations

#### Run Auditor (Gemini Vision)

Analyzes a screenshot for accessibility issues.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Screenshot | string | Yes | Base64-encoded image |

**Output:**
```json
{
  "score": 68,
  "issues": [
    {
      "criterion": "1.4.3",
      "severity": "serious",
      "description": "Submit button has insufficient contrast (2.8:1)",
      "element": "Blue button in footer",
      "suggestion": "Change to #0056b3 for 4.6:1 ratio"
    }
  ],
  "recommendations": [
    "Fix critical contrast issues first",
    "Add missing alt text to hero image"
  ]
}
```

#### Run Fixer (GPT-4)

Generates code fixes for accessibility issues.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| Code | string | Yes | Original HTML/JSX |
| Issue Description | string | Yes | What needs fixing |
| WCAG Criterion | string | No | e.g., "4.1.2" |

**Output:**
```json
{
  "fixed_code": "<button aria-label=\"Submit form\" class=\"btn-primary\">Submit</button>",
  "explanation": "Added aria-label to provide accessible name for the button",
  "changes": [
    "Added aria-label attribute with descriptive text"
  ]
}
```

---

### Trigger Configuration

#### Event Types

```
scan.completed     → Fires when accessibility scan finishes
scan.failed        → Fires when scan encounters error
issue.critical     → Fires when critical issues are found (score impact)
tracking.preference → Fires when user changes accessibility setting
*                  → Fires on any Ghost-UI event
```

#### Site ID Filter

Optionally filter events to specific sites:

```
Site ID Filter: "a1b2c3d4-5678-..."
```

Leave empty to receive events from all sites.

#### Webhook Payload Examples

**scan.completed:**
```json
{
  "event": "scan.completed",
  "timestamp": "2026-01-31T10:31:15Z",
  "data": {
    "scan_id": "abc-123",
    "url": "https://example.com",
    "score": 72,
    "issue_count": 15,
    "critical_count": 2
  }
}
```

**tracking.preference:**
```json
{
  "event": "tracking.preference",
  "timestamp": "2026-01-31T14:22:00Z",
  "site_id": "site-uuid",
  "data": {
    "preference": "highContrast",
    "enabled": true,
    "session_id": "xyz-789"
  }
}
```

---

## Example Workflows

### 1. Weekly Compliance Report

```
┌─────────────────────────────┐
│ Schedule Trigger            │
│ Every Monday 9:00 AM        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Ghost-UI: Start Scan        │
│ URL: https://mysite.com     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Ghost-UI: Wait for          │
│ Completion (timeout: 180s)  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Ghost-UI: Generate          │
│ Audit Report                │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ IF: score < 80              │
│ → Slack: Send Alert         │
│ → Email: Send Report        │
└─────────────────────────────┘
```

### 2. Critical Issue Alert Pipeline

```
┌─────────────────────────────┐
│ Ghost-UI Trigger:           │
│ issue.critical              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Ghost-UI: Get All Issues    │
│ Severity: critical          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Loop: For Each Issue        │
│                             │
│ ┌─────────────────────────┐ │
│ │ Ghost-UI: Run Fixer     │ │
│ │ (GPT-4 code fix)        │ │
│ └────────────┬────────────┘ │
│              │              │
│              ▼              │
│ ┌─────────────────────────┐ │
│ │ GitHub: Create Issue    │ │
│ │ with fix in description │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Slack: Post Summary         │
│ "3 critical issues fixed"   │
└─────────────────────────────┘
```

### 3. Multi-Site Monitoring Dashboard

```
┌─────────────────────────────┐
│ Schedule Trigger            │
│ Daily 6:00 AM               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ HTTP Request: Get Sites     │
│ from your CMS/database      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Loop: For Each Site         │
│                             │
│ ┌─────────────────────────┐ │
│ │ Ghost-UI: Start Scan    │ │
│ │ → Wait for Completion   │ │
│ │ → Get Score             │ │
│ └────────────┬────────────┘ │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Aggregate Results           │
│ Build dashboard data        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Airtable/Notion: Update     │
│ accessibility scorecard     │
└─────────────────────────────┘
```

### 4. Accessibility Preference Analytics

```
┌─────────────────────────────┐
│ Ghost-UI Trigger:           │
│ tracking.preference         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Switch: By Preference       │
│                             │
│ highContrast →  Track       │
│ dyslexiaFont →  in          │
│ focusMode    →  analytics   │
│ fontSize     →  tool        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Mixpanel/Amplitude:         │
│ Track accessibility usage   │
└─────────────────────────────┘
```

---

## Technical Details

### Node Implementation

**Files:**
- `src/nodes/GhostUI/GhostUI.node.ts` — Action node (770 lines)
- `src/nodes/GhostUI/GhostUITrigger.node.ts` — Trigger node (230 lines)
- `src/credentials/GhostUiApi.credentials.ts` — API key credential

### API Communication

```typescript
async function apiCall(method: string, endpoint: string, body?: object) {
  const credentials = await this.getCredentials('ghostUiApi');
  const baseUrl = credentials.baseUrl || 'https://ghostui.onrender.com';
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  return response.json();
}
```

### Webhook Registration

When trigger activates:
1. n8n generates unique webhook URL
2. Node calls `POST /api/webhooks` with URL and event type
3. Ghost-UI stores webhook subscription
4. On events, Ghost-UI POSTs to webhook URL
5. n8n workflow triggers with event data

---

## Troubleshooting

### Scan Timeout

If scans frequently timeout:
- Increase timeout in "Wait for Completion" (default: 120s)
- Some sites take longer due to JavaScript rendering
- Check Ghost-UI dashboard for scan status

### Webhook Not Firing

1. Verify API key is valid
2. Check webhook registered: `GET /api/webhooks`
3. Ensure event type matches (case-sensitive)
4. Check Ghost-UI backend logs

### Rate Limits

Ghost-UI API limits:
- Scans: 100/hour per API key
- Issues: 1000/hour
- Reports: 50/hour

---

## Resources

- [Ghost-UI Platform](https://ghostui.xyz)
- [Ghost-UI API Docs](https://ghostui.onrender.com/docs)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- [Report Issues](https://github.com/lucasbxyz/ghostui/issues)

---

## Development

```bash
cd packages/n8n-node
npm install
npm run build

# Link for local testing
npm link
cd ~/.n8n
npm link n8n-nodes-ghostui
```

### Publishing

```bash
npm version patch  # or minor/major
npm publish --access public
```

---

## License

MIT
