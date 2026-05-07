# Ghost-UI Restart Guide

Generated: 2026-01-31

---

## Current State Summary

### Main Branch (production-ready)
```
88c3978 Fix TypeScript errors and add schema proposal
1d04e28 Skip Vercel builds when dashboard unchanged
abafc1f Add vercel.json for SPA client-side routing
```

### Active Branches

| Branch | Ahead | Behind | Owner | Status |
|--------|-------|--------|-------|--------|
| `feat/supabase-auth-direct` | 2 | 0 | Lucas | Ready to merge |
| `origin/extension` | 7 | 0 | Paul | Ready to merge |
| `feat/typescript-fixes` | 1 | 2 | Lucas | Can be deleted (merged via CLI) |

### Stale Branches (can be deleted)
- `feat/lucas-scanner-form` - old, merged
- `feat/real-gemini-scanner` - old, merged
- `feat/auth` - Jannik's old auth (superseded)
- `feat/tracking` - Jannik's old tracking (merged)
- `feat/agents` - Jannik's old agents (merged)

---

## Team Priorities & Responsibilities

### Lucas (You)
1. **Immediate**: Set up Supabase credentials (see below)
2. **Immediate**: Test auth locally
3. **Immediate**: Merge `feat/supabase-auth-direct` to main
4. **Next**: Deploy backend to Render
5. **Next**: Configure Vercel environment variables

### Jannik
1. **Immediate**: Create Supabase tables from `docs/COMPLIANCE_SCHEMA_PROPOSAL.md`
2. **Optional**: Review Paul's `voice_agent/routes.py` (his ownership area)
3. **Later**: Update backend to use Supabase for scan storage

### Paul
1. **Immediate**: Create PR for `extension` branch (if not done)
2. **After Lucas merges auth**: Test extension with new auth flow
3. **Coordinate**: Voice agent backend code needs Jannik's awareness

---

## What You Need to Do for Supabase Auth

### Step 1: Get Supabase Credentials

Go to [supabase.com](https://supabase.com) → Your Project → Settings → API

Copy:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: `eyJhbGci...` (NOT service_role)

### Step 2: Create Environment File

```bash
cd ~/Desktop/ghostui
cat > dashboard/.env.local << 'EOF'
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BACKEND_URL=http://localhost:8000
EOF
```

### Step 3: Configure Supabase Dashboard

1. **Authentication → Providers → Email**: Ensure enabled
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: 
     - `http://localhost:3000/*`
     - `https://your-vercel-app.vercel.app/*`
3. **Optional**: Authentication → Providers → Email → Disable "Confirm email" (faster testing)

### Step 4: Test Locally

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload

# Terminal 2: Frontend
cd dashboard && npm run dev

# Test at http://localhost:3000
# 1. Click Sign Up
# 2. Create account
# 3. Should redirect to /tracking
# 4. Try /compliance - should work
# 5. Logout - should redirect to login
```

---

## What You Need for Deployment

### Render (Backend)

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

**Environment Variables:**
```
GEMINI_API_KEY=<your-gemini-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Vercel (Frontend)

| Setting | Value |
|---------|-------|
| Root Directory | `dashboard` |

**Environment Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=https://your-backend.onrender.com
```

---

## Ownership Violations & Audit

### What I (Agent) Changed Outside Lucas's Boundaries

| File | Original Owner | What Changed | Risk |
|------|----------------|--------------|------|
| `dashboard/src/features/auth/context/AuthContext.tsx` | Jannik | Rewrote to use Supabase directly | Low - Lucas took over |
| `dashboard/src/App.tsx` | HOT FILE | Removed test button, updated comments | Low - coordinated |

### Before Creating PR / Merging to Main

1. **Pull latest main**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Rebase your branch** (if behind):
   ```bash
   git checkout feat/supabase-auth-direct
   git rebase main
   ```

3. **Test the build**:
   ```bash
   cd dashboard && npm run build
   ```

4. **Test merge locally** (optional but safe):
   ```bash
   git checkout -b test-merge main
   git merge feat/supabase-auth-direct --no-commit
   # Check for conflicts
   git merge --abort
   git checkout feat/supabase-auth-direct
   git branch -D test-merge
   ```

### What Could Go Wrong When Merging

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Paul merges extension first | **LOW** - No file overlap | Merge in any order |
| Jannik pushes to auth files | **MEDIUM** - Would conflict with AuthContext | Coordinate via chat |
| Someone edits App.tsx | **MEDIUM** - HOT FILE | Quick commit & push |
| Backend changes to auth routes | **LOW** - Frontend auth is independent now | Backend still works |

### Potential Conflicts

| Your Branch | vs | Conflict? |
|-------------|-----|-----------|
| `feat/supabase-auth-direct` | `extension` (Paul) | ✅ NO - different files |
| `feat/supabase-auth-direct` | `main` | ✅ NO - 0 behind |
| `extension` | `main` | ✅ NO - 0 behind, tested clean |

### After Merging to Main

1. **Delete merged branch**:
   ```bash
   git push origin --delete feat/supabase-auth-direct
   ```

2. **Notify team**:
   ```
   @Team: Auth merged to main. Pull before working!
   git pull origin main
   ```

3. **Update Vercel environment variables** (if not done)

4. **Verify Vercel deployment** works

5. **Test auth flow on production**

---

## Merge Order Recommendation

1. **First**: `feat/supabase-auth-direct` (Lucas) - enables auth
2. **Second**: `extension` (Paul) - adds voice features
3. **Later**: Jannik's Supabase tables + backend storage

This order ensures:
- Auth works before other features rely on it
- No conflicts between branches
- Incremental testing at each step

---

## Quick Commands Reference

```bash
# Switch to auth branch
git checkout feat/supabase-auth-direct

# Merge to main (after testing)
git checkout main
git pull origin main
git merge feat/supabase-auth-direct
git push origin main

# Start local dev
cd backend && uvicorn main:app --reload  # Terminal 1
cd dashboard && npm run dev              # Terminal 2
```

---

## Files Summary

### Changed by Lucas (Auth Branch)
- `dashboard/src/features/auth/context/AuthContext.tsx` - Direct Supabase auth
- `dashboard/src/App.tsx` - Removed test bypass
- `dashboard/.env.local.example` - Template for credentials

### Unchanged (Compatible)
- `dashboard/src/lib/api.ts` - Still works (token compatible)
- `dashboard/src/lib/supabase.ts` - Already correct
- All tracking/agents code - Uses token from context
- All backend code - Verifies same Supabase JWT
