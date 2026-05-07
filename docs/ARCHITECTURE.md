# Ghost-UI Architecture

## System Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │     │   Extension     │
│  (React/Vite)   │     │   (Plasmo)      │
│                 │     │                 │
│  - Compliance   │     │  - Ghost UI     │
│  - Analytics    │     │  - A11y Controls│
│  - Agents       │     │  - Voice/Chat   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Backend   │
              │  (FastAPI)  │
              │             │
              │  - Auth     │
              │  - API      │
              │  - Agents   │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │Supabase │ │ Gemini  │ │ OpenAI  │
    │  (DB)   │ │ Vision  │ │  GPT-4  │
    └─────────┘ └─────────┘ └─────────┘
```

## Data Flow

### Compliance Scanning
1. User submits URL in Dashboard
2. Backend captures screenshot
3. Gemini Vision analyzes for WCAG issues
4. Issues stored in Supabase
5. GPT-4 generates code fixes on demand

### Extension Sync
1. User authenticates in Extension
2. Extension fetches preferences from Backend
3. Preferences applied to current page
4. Changes sync back to Dashboard

### Tracking
1. Embed script on customer site
2. Events sent to Backend
3. Stored in Supabase
4. Displayed in Dashboard analytics

## Team Ownership

See [TEAM_OWNERSHIP.md](../TEAM_OWNERSHIP.md)
