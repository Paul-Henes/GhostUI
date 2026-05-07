# Ghost-UI Pitch Deck
## Cursor Hackathon Hamburg 2026

---

# Slide 1: The Internet is Broken. We're Fixing It.

7.8 million people with disabilities in Germany face a locked door every time they go online. Buttons too small to click. Text impossible to read. Forms that don't work with screen readers. The internet wasn't built for everyone—but it should be.

And here's what makes this urgent: **On June 28, 2025, the Barrierefreiheitsstärkungsgesetz (BFSG) takes effect.** Every website selling products or services in Germany must be fully accessible. The penalty for non-compliance? **Up to €100,000 per violation.**

Most businesses don't even know they have a problem. Traditional accessibility audits take weeks, cost thousands, and produce 50-page reports that no developer wants to read. By the time you've fixed one issue, ten more have been introduced.

**The clock is ticking. And we built the solution.**

---

# Slide 2: One-Click Compliance. For a Web Without Barriers.

Ghost-UI makes WCAG compliance as simple as adding one line of code.

Our vision: accessibility shouldn't take months of consulting and hundreds of thousands in agency fees. It should take one click. We built the first platform that can scan a website, identify every accessibility violation, and automatically fix them—without touching your codebase.

**Here's how it works:**

**SCAN** — Enter any URL. Our AI takes a screenshot and runs it through Gemini Vision alongside axe-core analysis. In under 60 seconds, you have a complete WCAG 2.1 AA audit with German-language findings ready for BFSG compliance.

**FIX** — One embed script. Add it to your site, and Ghost-UI automatically injects accessibility fixes: missing alt text, proper ARIA labels, skip links, focus indicators, language attributes. No code changes required.

**TALK** — For users who need it, Ghost-UI adds an accessibility widget to your site. High contrast mode. Dyslexia-friendly fonts. Font size controls. Voice navigation. Your visitors customize their experience with one click.

Three steps. Zero friction. Complete compliance.

---

# Slide 3: The Eyes, Brain, and Voice of Accessibility

Traditional scanners only read code. They miss what humans see.

A button might have perfect HTML but unreadable contrast. A form might be technically labeled but visually confusing. Ghost-UI sees your website the way your users do—and that's what makes us different.

**Gemini Vision: The Eyes**

We don't just parse your DOM. We take a full-page screenshot and send it to Google's Gemini 2.0 Flash model. It analyzes your website like a human auditor would: checking color contrast ratios, button sizes, visual hierarchy, heading structure, and dozens of WCAG criteria that code-only scanners miss. The result? Issues that traditional tools never catch.

**GPT-4: The Brain**

When we find a problem, we fix it. Our Code Fixer agent takes each accessibility issue and generates a targeted patch. Missing alt text? We analyze the image context and suggest descriptive alternatives. Empty button? We infer the purpose from surrounding elements. Every fix is specific, actionable, and ready to deploy.

**ElevenLabs: The Voice**

For users who navigate by sound, we're integrating voice navigation. Screen readers are powerful but generic. Ghost-UI's voice agent understands your specific page structure and guides users naturally through your content.

Three AI systems. One seamless experience. Accessibility that actually works.

---

# Slide 4: Compliance on Autopilot

Accessibility isn't a one-time fix. It's an ongoing commitment.

Every time your team ships a feature, accessibility can break. Every new image needs alt text. Every form needs labels. Manual audits can't keep up with modern development velocity. That's why we built Ghost-UI to integrate directly into your workflow.

**Introducing the Ghost-UI n8n Community Node**

n8n is the workflow automation platform used by thousands of companies. Our community node brings accessibility automation to every team:

- **Nightly Scans** — Schedule automatic scans of your production site. Wake up to a fresh accessibility score every morning.
- **Instant Alerts** — Critical issue found? Slack message fires immediately. Your team knows before your users complain.
- **Jira Integration** — Every accessibility violation becomes a ticket with severity, WCAG criterion, and suggested fix. No manual triage required.
- **Executive Reports** — Monthly PDF reports sent directly to stakeholders. Compliance documentation on autopilot.

**Example Workflow:**

```
Schedule (Monday 9am)
    → Ghost-UI: Scan website
    → IF score < 80: Slack alert
    → Ghost-UI: Generate PDF report
    → Email to compliance team
```

Set it once. Never think about it again. Your website stays compliant while you focus on building features.

This isn't just monitoring. It's accessibility as a service.

---

# Slide 5: More Than a Hackathon Project. A Movement.

Let's be honest: most hackathon projects die after demo day.

Ghost-UI won't. Because this isn't just a technical exercise—it's a mission. Every day that passes, millions of people are locked out of the digital economy. They can't shop. They can't bank. They can't access the services that the rest of us take for granted.

**Why we'll win:**

- **Real Problem** — BFSG affects every business in Germany. The market is massive and the deadline is imminent.
- **Real Technology** — Gemini Vision, GPT-4, n8n automation. We're not demoing vaporware—everything works today.
- **Real Scale** — One script tag. Any website. Millions of potential users.

**The Team:**

We're three Master's students who believe the web should work for everyone. Lucas built the compliance engine. Jannik architected the backend and AI agents. Paul crafted the browser extension. We've written 27,000 lines of code in 48 hours because this matters to us.

**The Ask:**

We're not just here to win prizes (though we'd like those too). We're here to find believers. Partners. Early adopters. People who understand that accessibility isn't a checkbox—it's a human right.

**Ghost-UI. Because the web should work for everyone.**

Join us. Let's build a web without barriers.

---

# Technical Appendix

## For Judges: Best Use of Gemini AI

### Implementation Details

**File**: `backend/app/services/gemini_service.py` (212 lines)

**Model**: Gemini 2.0 Flash (`gemini-2.0-flash`)

**Integration Pattern**:
```python
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

# Screenshot analysis
response = model.generate_content([
    WCAG_AUDIT_PROMPT,  # 100+ line structured prompt
    {"mime_type": "image/png", "data": screenshot_base64}
])
```

**Custom WCAG Audit Prompt** (excerpt):
```
You are an expert WCAG 2.1 Level AA accessibility auditor...

1. VISUAL HIERARCHY & CONTRAST
   - Check color contrast ratios (WCAG 1.4.3: min 4.5:1 for text)
   - Identify low-contrast text/buttons
   - Check focus indicators visibility

2. INTERACTIVE ELEMENTS
   - Buttons: size (min 44x44px), labels, keyboard access
   - Forms: labels, error messages, required fields

3. CONTENT STRUCTURE
   - Heading hierarchy (h1 → h2 → h3)
   - Alt text for images
   - Semantic HTML usage
...

Respond ONLY with valid JSON:
{
    "score": <number 0-100>,
    "issues": [{
        "criterion": "1.4.3",
        "severity": "serious",
        "description": "Submit button has contrast ratio of 2.8:1, needs 4.5:1",
        "element": "Blue button in footer",
        "suggestion": "Change button color to #0056b3"
    }]
}
```

**Why Gemini Vision?**
- Can analyze visual elements that DOM parsers miss
- Understands spatial relationships (is this button visually grouped with this label?)
- Evaluates color contrast from rendered pixels, not CSS values
- Detects issues in dynamically generated content

**Error Handling**:
- Rate limit detection with graceful fallback to axe-core only
- JSON parsing with markdown code block stripping
- Timeout handling for slow responses

---

## For Judges: Best Use of n8n

### Published Community Node

**Package**: `n8n-nodes-ghostui` on npm

**Installation**: Settings → Community Nodes → Install `n8n-nodes-ghostui`

### Node Architecture

**Action Node** (`GhostUI.node.ts` - 770 lines):
- 5 resources: Scan, Issue, Report, Agent, Analytics
- 12 operations with full parameter validation
- Async polling for scan completion
- Structured output for downstream nodes

**Trigger Node** (`GhostUITrigger.node.ts` - 230 lines):
- Webhook-based event subscription
- 6 event types: scan.completed, scan.failed, issue.critical, tracking.preference, tracking.event, *
- Optional site ID filtering
- Automatic webhook registration/cleanup

### Backend Webhook System

**File**: `backend/app/api/webhooks/routes.py`

```python
@router.post("")
async def create_webhook(webhook: WebhookCreate, user: User):
    # Store webhook subscription
    supabase.table("webhooks").insert({
        "url": webhook.url,
        "event": webhook.event,  # e.g., "scan.completed"
        "user_id": user.id
    }).execute()

async def deliver_webhook(event_type: str, data: dict):
    # Find matching webhooks and deliver
    webhooks = supabase.table("webhooks")
        .select("url, secret")
        .eq("event", event_type)
        .eq("is_active", True)
        .execute()
    
    for webhook in webhooks:
        await httpx.post(webhook["url"], json={
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
```

### Example Workflows

**Weekly Compliance Check**:
```
Schedule (Weekly) → Ghost-UI: Start Scan → Wait for Completion 
→ IF Score < 80 → Slack Alert + Email Report
```

**Auto-Fix Pipeline**:
```
Ghost-UI Trigger (scan.completed) → Get Critical Issues 
→ Loop: For Each Issue → Ghost-UI: Run Fixer → GitHub: Create PR
```

**Accessibility Analytics**:
```
Ghost-UI Trigger (tracking.preference) → Switch by Preference Type 
→ Mixpanel: Track Event
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Ghost-UI Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard (React)        Extension (Plasmo)      n8n Node      │
│       Vercel                 Chrome MV3            npm pkg      │
│         │                        │                    │         │
│         └────────────────────────┼────────────────────┘         │
│                                  │                               │
│                                  ▼                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              FastAPI Backend (Render + Docker)             │  │
│  │                                                            │  │
│  │  /api/compliance/scan     POST   Start WCAG scan          │  │
│  │  /api/compliance/scan/:id GET    Get scan results         │  │
│  │  /api/agents/fixer/run    POST   GPT-4 code fix           │  │
│  │  /api/agents/auditor/run  POST   Gemini Vision analysis   │  │
│  │  /api/webhooks            CRUD   n8n webhook management   │  │
│  │  /ghostui.js              GET    Unified embed script     │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                        │           │           │                 │
│                        ▼           ▼           ▼                 │
│                   Supabase    Gemini API   OpenAI API           │
│                  PostgreSQL    Vision 2.0    GPT-4              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Lines of Code |
|-------|------------|---------------|
| Frontend | React 18, Vite, Tailwind, Framer Motion | ~8,000 |
| Backend | FastAPI, Playwright, Pydantic | ~12,000 |
| Extension | Plasmo, React, Chrome MV3 | ~2,000 |
| n8n Node | TypeScript, n8n-workflow | ~1,000 |
| Database | Supabase PostgreSQL | ~500 (migrations) |
| **Total** | | **~27,500** |

---

## Key Differentiators

| Traditional Scanners | Ghost-UI |
|---------------------|----------|
| Code-only analysis | Visual + code analysis |
| Report-only output | Auto-fix generation |
| Manual re-scans | Automated monitoring |
| English reports | German BFSG compliance |
| No integration | n8n workflow automation |

---

## Live Demo

- **Dashboard**: https://ghostui.xyz
- **Backend API**: https://ghostui.onrender.com
- **API Documentation**: https://ghostui.onrender.com/docs
- **n8n Node**: https://www.npmjs.com/package/n8n-nodes-ghostui

---

## Contact

**Team Ghost-UI**
- Lucas (Compliance, n8n) 
- Jannik (Backend, Agents, Supabase)
- Paul (Chrome Extension)

Cursor Hackathon Hamburg 2026
