# Team Ownership

## Quick Reference

| Person | Primary Areas |
|--------|---------------|
| **Lucas** | Compliance features, n8n node |
| **Jannik** | Auth, Tracking, Agents, Backend core, Supabase |
| **Paul** | Chrome Extension (complete ownership) |

---

## Detailed Ownership Map

### Dashboard (`/dashboard/src/`)

| Path | Owner | Description |
|------|-------|-------------|
| `features/auth/` | Jannik | Login, signup, user session |
| `features/compliance/` | Lucas | Scanner, issues, fix generator |
| `features/tracking/` | Jannik | Analytics, events, heatmaps |
| `features/agents/` | Jannik | AI agent UI/orchestration |
| `features/settings/` | SHARED | User preferences |
| `components/ui/` | SHARED | v0-generated components |
| `lib/` | SHARED | Utilities, API client |

### Backend (`/backend/app/`)

| Path | Owner | Description |
|------|-------|-------------|
| `api/auth/` | Jannik | Auth endpoints |
| `api/compliance/` | Lucas | Compliance endpoints |
| `api/tracking/` | Jannik | Tracking endpoints |
| `api/agents/` | Jannik | Agent endpoints |
| `api/preferences/` | SHARED | User prefs endpoints |
| `services/` | SHARED | AI services |
| `main.py` | SHARED | 🔥 HOTFILE |

### Extension (`/extension/`)

| Path | Owner | Description |
|------|-------|-------------|
| Everything | Paul | Complete ownership |

### Packages (`/packages/`)

| Path | Owner | Description |
|------|-------|-------------|
| `n8n-node/` | Lucas | n8n community node |
| `tracking-script/` | Jannik | Embed tracking script |
| `shared-types/` | SHARED | 🔥 HOTFILE - coordinate! |

### Infrastructure

| Path | Owner | Description |
|------|-------|-------------|
| `/supabase/` | Jannik | Database schema, migrations |

---

## Hot Files (Always Coordinate!)

Before editing these files, post in team chat:

- `.cursorrules`
- `dashboard/src/App.tsx`
- `backend/main.py`
- `packages/shared-types/src/index.ts`
- `supabase/migrations/*`

---

## Conflict Prevention

1. Stay in your owned folders
2. If you need to edit a SHARED file, announce it first
3. Pull `main` at least 2x daily
4. Keep commits small and frequent
