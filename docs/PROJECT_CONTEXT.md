# Ghost-UI Project Context

Complete context for the hackathon team. Share this with teammates so everyone is aligned.

---

## What We're Building

**Ghost-UI (AccessAI)** is a dual-component web accessibility platform:

### Component 1: Dashboard (Web App)
Single pane to scan, track, and resolve accessibility issues across websites.

**Features:**
- WCAG/EAA Compliance Scanner
- Issue Management & Reporting
- One-Click Fix Generator (AI-powered)
- Website Tracking & Analytics
- AI Agent Orchestration

### Component 2: Browser Extension (Ghost UI)
Empowers users to personalize accessibility settings per site.

**Features:**
- High Contrast Mode
- Font Size Controls
- Dyslexia-Friendly Font
- Focus Mode
- Custom CSS Injection
- Cloud Sync with Dashboard

### AI Agents
- **Accessibility Auditor**: Screenshot analysis for WCAG violations (Gemini Vision)
- **Code Fixer**: Generates targeted code patches (GPT-4)
- **UX Analyzer**: Converts tracking data into insights
- **Personalizer**: Recommends UI adjustments from behavior patterns

---

## Tech Stack

| Component | Technology | Deployment |
|-----------|------------|------------|
| Dashboard | React + Vite + Tailwind | Vercel |
| Extension | Plasmo (Manifest V3) | Chrome Web Store |
| Backend | FastAPI (Python) | Replit |
| Database | Supabase (PostgreSQL) | Supabase Cloud |
| AI | Gemini Vision, OpenAI GPT-4 | API |
| Automation | n8n | n8n Cloud |

---

## Team Ownership

| Person | Primary Areas |
|--------|---------------|
| **Lucas** | Compliance features, n8n community node |
| **Jannik** | Auth, Tracking, Agents, Backend core, Supabase |
| **Paul** | Chrome Extension (complete ownership) |

### Detailed Ownership Map

```
Dashboard (/dashboard/src/)
├── features/auth/          → Jannik
├── features/compliance/    → Lucas
├── features/tracking/      → Jannik
├── features/agents/        → Jannik
├── features/settings/      → SHARED
├── components/             → SHARED
└── lib/                    → SHARED

Backend (/backend/app/)
├── api/auth/               → Jannik
├── api/compliance/         → Lucas
├── api/tracking/           → Jannik
├── api/agents/             → Jannik
├── api/preferences/        → SHARED
└── services/               → SHARED

Extension (/extension/)     → Paul (everything)

Packages (/packages/)
├── n8n-node/               → Lucas
├── tracking-script/        → Jannik
└── shared-types/           → SHARED (coordinate!)

Infrastructure
└── supabase/               → Jannik
```

---

## Git Workflow

We use a **Simple Feature Branch** workflow optimized for a 3-person hackathon team with beginner Git experience.

### Branch Strategy

```
main (always working/demo-ready)
  │
  ├── feat/auth-login      (Jannik's feature)
  ├── feat/compliance-scanner (Lukas's feature)
  └── feat/ghost-ui-popup  (Paul's feature)
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/user-login` |
| Fix | `fix/what-broke` | `fix/button-crash` |
| Experiment | `exp/idea-name` | `exp/ai-chat` |

### Daily Workflow

**Morning:**
1. Pull latest `main`: `git pull origin main`
2. Quick sync: "I'm working on X today"

**While Working:**
1. Commit every 30-60 minutes
2. Push your branch frequently
3. Pull `main` into your branch 1-2x daily

**Before Merging:**
1. Pull latest `main` into your branch
2. Test that everything works
3. Merge to main and push

### Essential Commands

```bash
# Start new feature
git checkout main && git pull origin main
git checkout -b feat/feature-name

# Save work
git add . && git commit -m "Add login form"
git push origin feat/feature-name

# Sync with main (do 1-2x daily)
git pull origin main

# Merge to main
git checkout main && git pull origin main
git merge feat/feature-name
git push origin main
git branch -d feat/feature-name
```

### Emergency Rollback

If `main` breaks:
```bash
git checkout main
git pull origin main
git revert -m 1 HEAD
git push origin main
```

---

## Hot Files Warning

These files are touched by multiple features. **Always announce in team chat before editing:**

| File | Why It's Hot |
|------|--------------|
| `dashboard/src/App.tsx` | Everyone adds routes |
| `backend/main.py` | Everyone registers routers |
| `packages/shared-types/src/index.ts` | Shared types |
| `supabase/migrations/*` | Database schema |
| `.cursorrules` | Project config |

**Before editing a hot file:** Post in Slack/Discord: "I'm editing [filename] for [reason]"

---

## Coding Guidelines (Soft Rules)

These are preferences, not strict rules. Deviate when it makes sense.

### React / Dashboard
- Prefer functional components with hooks
- Prefer Tailwind utility classes over custom CSS
- Consider PascalCase for component files (`LoginForm.tsx`)
- Consider keeping components small and focused

### FastAPI / Backend
- Prefer async functions for endpoints
- Consider using Pydantic models for request/response
- Prefer consistent error responses: `{"success": bool, "data": ..., "error": ...}`

### Extension
- Follow Plasmo conventions
- Prefer Chrome Storage API for persistence
- Sync preferences with dashboard via API

### Accessibility (We're Building an A11y Tool!)
- Prefer semantic HTML (`button`, `nav`, `main`)
- Consider keyboard navigation
- Consider ARIA labels for non-obvious UI

---

## Hard Rules (Do Not Break)

Only 3 non-negotiable rules:

1. **Never commit secrets** — No `.env` files, API keys, or credentials in code
2. **Never push broken code to main** — Test before merging
3. **Coordinate on hot files** — Announce before editing shared files

---

## API Endpoints (Planned)

```
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/me

GET  /api/user/preferences
POST /api/user/preferences

POST /api/compliance/scan
GET  /api/compliance/scan/{scan_id}
GET  /api/compliance/scan/{scan_id}/issues
POST /api/compliance/fix

POST /api/tracking/event
GET  /api/tracking/events
GET  /api/tracking/analytics

GET  /api/agents
POST /api/agents/auditor/run
POST /api/agents/fixer/run
```

---

## Environment Variables

Each component needs these (copy from `.env.example`):

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# n8n
N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/

# Dashboard
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Quick Start

```bash
# Clone repo
git clone https://github.com/lucasbxyz/ghostui.git
cd ghostui

# Install dependencies
pnpm install

# Start dashboard (terminal 1)
pnpm dev:dashboard

# Start extension (terminal 2)
pnpm dev:extension

# Start backend (terminal 3)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Cursor Setup

The `.cursorrules` file is automatically loaded when you open the project in Cursor. Your AI assistant will know:

- Project context and architecture
- Team ownership boundaries
- Hot files to coordinate on
- Git workflow rules

**Verify it's working:** Ask your Cursor agent "What project are we building?" — it should describe Ghost-UI.

---

## Communication

- **Before editing hot files:** Announce in team chat
- **When you merge to main:** Announce so others can pull
- **If you break something:** Tell the team immediately
- **Daily standup:** Quick sync on who's working on what

---

## MVP Scope (48h Hackathon)

### Day 1
- [ ] Supabase auth setup
- [ ] Dashboard scaffold with routes
- [ ] Extension scaffold with popup
- [ ] Basic compliance scanner
- [ ] Extension contrast/font controls

### Day 2
- [ ] One-Click Fix generator
- [ ] Ghost UI polish
- [ ] Preference sync (Dashboard ↔ Extension)
- [ ] Tracking MVP
- [ ] Demo preparation

---

## Success Metrics

**For Demo:**
- Live compliance scan of a website
- Show issues with severity levels
- Generate a code fix with AI
- Extension applying accessibility settings
- Settings syncing between dashboard and extension

---

*Last updated: Hackathon Day 1*
