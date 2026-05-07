# Ghost-UI Dashboard

React web application for managing accessibility compliance, running AI agents, and tracking user analytics.

## Features

### Compliance Scanner
- Enter any URL to scan for WCAG 2.1 AA violations
- AI-powered analysis using Gemini Vision + axe-core
- Severity-based issue categorization
- One-click fix script generation
- BFSG accessibility statement generator

### AI Agents
- **Accessibility Auditor** — Gemini Vision screenshot analysis
- **Code Fixer** — GPT-4 generates targeted code patches
- **UX Analyzer** — Converts tracking data into insights

### Analytics
- Track accessibility preferences across your sites
- See which features users enable (high contrast, dyslexia font, etc.)
- Session and pageview analytics

### Settings
- API key management for n8n integration
- Embed code generator for your sites

---

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Supabase** for auth and data
- **React Router** for navigation

---

## Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
cd dashboard
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
```

### Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=https://ghostui.onrender.com
```

### Development

```bash
pnpm dev
# Opens at http://localhost:5173
```

### Build

```bash
pnpm build
# Output in dist/
```

---

## Project Structure

```
dashboard/src/
├── components/
│   ├── layout/         # DashboardLayout, ProtectedRoute
│   └── ui/             # Button, Card, Input, Table
├── features/
│   ├── auth/           # Login, Signup, AuthContext
│   ├── compliance/     # Scanner, Issues, Reports
│   ├── agents/         # AI agent cards and runners
│   ├── tracking/       # Analytics dashboard
│   ├── settings/       # API keys, preferences
│   └── landing/        # Public landing page
├── lib/
│   ├── api.ts          # Backend API client
│   ├── supabase.ts     # Supabase client
│   └── types.ts        # TypeScript types
├── App.tsx             # Router config
└── main.tsx            # Entry point
```

---

## Key Components

### CompliancePage
Main scanner interface. Handles:
- URL input and scan initiation
- Real-time progress updates
- Issue display with severity badges
- Fix script modal

### AgentsPage
AI agent orchestration:
- Agent cards with run buttons
- Result viewer for outputs
- Run history

### AnalyticsPage
Tracking dashboard:
- Site selector
- Stats cards (pageviews, sessions, events)
- Embed snippet generator

---

## Deployment

Deployed on **Vercel** with automatic deploys from `main` branch.

### Vercel Config

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Build Settings
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

## Design System

Uses Tailwind with custom design tokens:

```css
/* Primary: Blue gradient */
bg-gradient-to-r from-blue-500 to-purple-600

/* Surface colors */
bg-white, bg-gray-50, bg-gray-100

/* Severity colors */
critical: red-600
serious: orange-500
moderate: yellow-500
minor: blue-500
```

---

## Accessibility

We practice what we preach:
- Semantic HTML throughout
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators visible
- Color contrast compliant
