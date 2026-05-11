# Ghost-UI

**Making the web accessible for everyone. One click at a time.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![n8n Community Node](https://img.shields.io/npm/v/n8n-nodes-ghostui?label=n8n%20node)](https://www.npmjs.com/package/n8n-nodes-ghostui)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://ghostui.xyz)

---

## Why Ghost-UI?

**The Problem**: On June 28, 2025, the German Barrierefreiheitsstärkungsgesetz (BFSG) comes into effect. Websites that aren't accessible face penalties up to €100,000. But accessibility compliance is complex, expensive, and time-consuming.

**Our Solution**: Ghost-UI makes WCAG compliance as simple as adding one line of code. We combine AI-powered scanning (Gemini Vision), automatic fixes, and a user-facing accessibility widget to create a web that works for everyone.

<img width="1430" height="769" alt="Screenshot 2026-05-07 at 13 33 41" src="https://github.com/user-attachments/assets/de8bc904-9abe-4d48-aa17-1fe16f670c55" />

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Ghost-UI Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Dashboard  │    │  Extension   │    │    n8n Community     │  │
│  │  React/Vite  │    │   Plasmo     │    │        Node          │  │
│  │   Vercel     │    │  Chrome MV3  │    │    npm package       │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                       │               │
│         └───────────────────┼───────────────────────┘               │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Backend (Render)                   │   │
│  │  ┌─────────────┬─────────────┬─────────────┬──────────────┐  │   │
│  │  │ Compliance  │   Agents    │  Tracking   │   Webhooks   │  │   │
│  │  │   Scanner   │  (AI/LLM)   │  Analytics  │   (n8n)      │  │   │
│  │  └─────────────┴─────────────┴─────────────┴──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   Supabase  │    │   Gemini    │    │   OpenAI    │             │
│  │  PostgreSQL │    │   Vision    │    │   GPT-4     │             │
│  │    + Auth   │    │    API      │    │    API      │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Deep Dive

### Frontend (Dashboard)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool & dev server |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Framer Motion | 11.x | Animations |
| React Router | 6.x | Client-side routing |
| Supabase JS | 2.x | Auth & realtime |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109+ | Async Python web framework |
| Playwright | 1.40+ | Headless browser automation |
| Pydantic | 2.x | Request/response validation |
| Supabase | 2.x | Database client |
| WeasyPrint | 60+ | PDF report generation |
| google-generativeai | 0.3+ | Gemini Vision API |
| openai | 1.x | GPT-4 API |

### Browser Extension

| Technology | Version | Purpose |
|------------|---------|---------|
| Plasmo | 0.84+ | Extension framework |
| React | 18.x | Popup & options UI |
| Chrome MV3 | - | Manifest V3 APIs |
| Chrome Storage | - | Local persistence |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Vercel | Dashboard hosting, CDN |
| Render | Backend hosting (Docker) |
| Supabase | PostgreSQL, Auth, Storage |
| GitHub | Source control, CI |

---

## AI Integrations

### Gemini Vision (Google)

**Model**: `gemini-2.0-flash`

**Purpose**: Visual accessibility analysis of screenshots

**How it works**:
1. Playwright captures full-page screenshot
2. Image sent to Gemini Vision API with structured WCAG audit prompt
3. AI analyzes: color contrast, button sizes, heading structure, focus indicators
4. Returns JSON with severity-scored issues and fix suggestions

**Prompt Engineering**: Custom 100+ line prompt covering WCAG 2.1 AA criteria including:
- Color contrast ratios (4.5:1 minimum)
- Touch target sizes (44x44px minimum)
- Heading hierarchy validation
- Alt text presence detection
- Focus indicator visibility

### OpenAI GPT-4

**Model**: `gpt-4-turbo`

**Purpose**: Code fix generation

**How it works**:
1. Takes accessibility issue + element context
2. Generates targeted code patch
3. Returns fix with explanation and WCAG reference

### axe-core

**Version**: Latest via CDN injection

**Purpose**: DOM-level accessibility testing

**How it works**:
1. Injected into page via Playwright
2. Runs comprehensive rule set
3. Returns violations with selectors and impact levels

**Combined Analysis**: Issues from axe-core and Gemini are merged and deduplicated for comprehensive coverage.

---

## n8n Integration

### Community Node: `n8n-nodes-ghostui`

Published on npm, installable via n8n Community Nodes.

**Action Node Operations**:

| Resource | Operation | Description |
|----------|-----------|-------------|
| Scan | Start Scan | Initiate WCAG accessibility scan |
| Scan | Get Status | Check scan completion status |
| Scan | Wait for Completion | Poll until scan finishes |
| Scan | Get Fix Script | Get one-click fix embed URL |
| Issue | Get All Issues | List issues with severity filter |
| Issue | Get Details | Single issue with context |
| Report | Generate Audit | Create PDF audit report |
| Report | Generate Statement | Create BFSG statement |
| Agent | Run Auditor | Gemini Vision analysis |
| Agent | Run Analyzer | UX analysis agent |
| Agent | Run Fixer | GPT-4 code fix generation |
| Analytics | Get Data | Retrieve tracking analytics |

**Trigger Node Events**:

| Event | Payload |
|-------|---------|
| `scan.completed` | `{scan_id, url, score, issue_count}` |
| `scan.failed` | `{scan_id, url, error}` |
| `issue.critical` | `{scan_id, url, critical_count}` |
| `tracking.preference` | `{site_id, preference, enabled}` |
| `*` | All events (wildcard) |

**Webhook Architecture**:
```
Ghost-UI Backend                    n8n
     │                               │
     │  POST /api/webhooks           │
     │  (register webhook URL)       │
     │ ◄─────────────────────────────┤
     │                               │
     │  Event occurs (scan done)     │
     │                               │
     │  POST to webhook URL          │
     ├──────────────────────────────►│
     │  {event, data, timestamp}     │
     │                               │
     │                          Workflow triggers
```

---

## One-Click Fix System

### How It Works

```html
<script src="https://ghostui.onrender.com/ghostui.js?site_id=X&scan_id=Y"></script>
```

This single script provides:

1. **Automatic Fixes** — Applies fixes from your scan results:
   - Missing alt text injection
   - ARIA labels for empty buttons/links
   - Form input labeling
   - Skip-to-content link
   - Language attribute (`lang="de"`)
   - Focus indicator styles

2. **Accessibility Widget** — Floating UI for user customization:
   - High contrast mode toggle
   - Dyslexia-friendly font (OpenDyslexic)
   - Focus mode (reduces visual noise)
   - Font size slider (75-200%)

3. **Analytics Tracking** — Records accessibility preference usage:
   - Pageviews, clicks, scroll depth
   - Preference change events
   - Session tracking

### Fix Generation Pipeline

```
Scan Issues → generate_fixes_from_issues() → Fix Config JSON
                                                    │
                                                    ▼
                                            /ghostui.js endpoint
                                                    │
                                                    ▼
                                            Dynamic JS with:
                                            - Tracking code
                                            - Fix application
                                            - Widget injection
```

---

## Database Schema

### Core Tables (Supabase PostgreSQL)

```sql
-- Compliance scans
compliance_scans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  url TEXT NOT NULL,
  status TEXT, -- pending, scanning, completed, failed
  score INTEGER,
  issue_count INTEGER,
  created_at TIMESTAMPTZ
)

-- Accessibility issues
compliance_issues (
  id UUID PRIMARY KEY,
  scan_id UUID REFERENCES compliance_scans,
  severity TEXT, -- critical, serious, moderate, minor
  wcag_criterion TEXT,
  description TEXT,
  location TEXT,
  element_html TEXT
)

-- Tracking events
tracking_events (
  id UUID PRIMARY KEY,
  site_id UUID,
  type TEXT, -- pageview, click, scroll, preference
  url TEXT,
  session_id TEXT,
  data JSONB
)

-- Webhook subscriptions (n8n)
webhooks (
  id UUID PRIMARY KEY,
  user_id UUID,
  url TEXT,
  event TEXT, -- scan.completed, issue.critical, etc.
  is_active BOOLEAN
)
```

---

## API Reference

### Scan Endpoints

```
POST /api/compliance/scan
  Body: { url: "https://example.com" }
  Returns: { scan_id, status }

GET /api/compliance/scan/{id}
  Returns: { id, url, status, score, issue_count, ... }

GET /api/compliance/scan/{id}/issues?severity=critical&page=1
  Returns: { issues: [...], total, page }
```

### Agent Endpoints

```
POST /api/agents/fixer/run
  Body: { code: "<button></button>", issue_description: "..." }
  Returns: { fixed_code, explanation, changes }

POST /api/agents/auditor/run
  Body: { screenshot_base64: "..." }
  Returns: { score, issues, recommendations }
```

### Webhook Endpoints

```
POST /api/webhooks
  Body: { url: "https://n8n.example.com/webhook/...", event: "scan.completed" }
  Returns: { id, url, event }

DELETE /api/webhooks/{id}
  Returns: { deleted: true }
```

---

## Project Structure

```
ghostui/
├── dashboard/                 # React frontend
│   ├── src/
│   │   ├── features/
│   │   │   ├── compliance/    # Scanner UI
│   │   │   ├── agents/        # AI agent runners
│   │   │   ├── tracking/      # Analytics dashboard
│   │   │   └── auth/          # Login/signup
│   │   └── components/        # Shared UI components
│   └── package.json
│
├── backend/                   # FastAPI server
│   ├── app/
│   │   ├── api/
│   │   │   ├── compliance/    # Scanner endpoints (2000+ lines)
│   │   │   ├── agents/        # AI agent endpoints
│   │   │   ├── tracking/      # Analytics endpoints
│   │   │   └── webhooks/      # n8n integration
│   │   └── services/
│   │       ├── gemini_service.py
│   │       ├── openai_service.py
│   │       └── report_service.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── extension/                 # Chrome extension
│   ├── src/
│   │   ├── popup.tsx          # Main popup UI
│   │   ├── contents/          # Content scripts
│   │   └── background/        # Service worker
│   └── package.json
│
├── packages/
│   └── n8n-node/              # n8n community node
│       ├── src/nodes/GhostUI/
│       │   ├── GhostUI.node.ts       # Action node (770 lines)
│       │   └── GhostUITrigger.node.ts # Trigger node (230 lines)
│       └── package.json
│
└── supabase/
    └── migrations/            # Database schema
```

---

## Quick Start

```bash
# Clone repo
git clone https://github.com/lucasbxyz/ghostui.git
cd ghostui

# Install dependencies
pnpm install

# Start dashboard
pnpm dev:dashboard

# Start extension (separate terminal)
pnpm dev:extension

# Start backend (separate terminal)
cd backend
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --reload
```

---

## Environment Variables

### Backend (`.env`)

```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...

# Config
BACKEND_PUBLIC_URL=https://ghostui.onrender.com
DEBUG=false
```

### Dashboard (`.env.local`)

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=https://ghostui.onrender.com
```

---

## Team

Built by three Master's students at the Cursor Hackathon Hamburg:

| Member | Responsibility |
|--------|---------------|
| **Lucas** | Compliance scanner, n8n node, one-click fix |
| **Jannik** | Auth, Tracking, Agents, Backend core, Supabase |
| **Paul** | Chrome Extension |

---

## Live Demo

- **Dashboard**: https://ghostui.xyz
- **Backend API**: https://ghostui.onrender.com
- **API Docs**: https://ghostui.onrender.com/docs
- **n8n Node**: https://www.npmjs.com/package/n8n-nodes-ghostui

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Ghost-UI** — Because the web should work for everyone. 👻
