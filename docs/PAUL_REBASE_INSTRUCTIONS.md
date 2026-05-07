# CRITICAL: READ EVERYTHING BEFORE DOING ANYTHING

You are helping me (Paul) safely sync my `extension` branch with the latest `main`.

## 🚫 ABSOLUTE RULES - NEVER BREAK THESE

1. **NEVER** run any command without showing me first and getting my explicit "yes"
2. **NEVER** delete any files
3. **NEVER** use `git reset --hard`
4. **NEVER** use `git clean`
5. **NEVER** force push without my written confirmation "YES, FORCE PUSH NOW"
6. **NEVER** resolve a conflict without showing me both versions first
7. **NEVER** proceed to the next step if the current step failed
8. **ALWAYS** create a backup branch before ANY destructive operation
9. **ALWAYS** stop and ask me if anything unexpected happens
10. **IF IN DOUBT** → STOP and ask Lucas (the team lead)

## 📁 MY FILES (NEVER LOSE THESE)

I own these files. In ANY conflict, MY version wins:

```
extension/src/components/StatusIndicator.tsx
extension/src/components/VoiceWidget.tsx  
extension/src/contents/voice-agent.tsx
extension/src/lib/scraper.ts
extension/src/lib/voice-agent-api.ts
extension/src/styles/widget.css
extension/.env.example
```

## 📁 LUCAS'S FILES (HIS VERSION WINS)

In ANY conflict on these files, keep MAIN's version:

```
backend/app/api/compliance/routes.py
backend/app/services/gemini_service.py
backend/requirements.txt
backend/runtime.txt
dashboard/src/features/compliance/*
```

## 📁 SPECIAL HANDLING

- `dashboard/src/App.tsx` → STOP and show me both versions. I decide manually.
- `dashboard/package-lock.json` → Delete and regenerate with `npm install`
- `docs/FUTURE_IDEAS.md` → Combine both versions (keep all ideas)

---

## STEP-BY-STEP PROCESS

### PHASE 1: SAFETY CHECK (Do this first!)

**Step 1.1** - Show current state

```bash
git status
git branch
git stash list
```

→ Show me output. Do NOT proceed until I confirm I see it.

**Step 1.2** - Check for uncommitted changes

If there are uncommitted changes, ask me:
"You have uncommitted changes. Should I stash them? (yes/no)"

- If yes: `git stash push -m "Paul backup before rebase $(date)"`
- If no: STOP. Tell me to commit first.

**Step 1.3** - Verify I'm on the right branch

```bash
git branch --show-current
```

Must show `extension`. If not, ask me before switching.

---

### PHASE 2: CREATE SAFETY BACKUP

**Step 2.1** - Create backup branch (MANDATORY)

```bash
git branch backup-extension-before-rebase-$(date +%Y%m%d-%H%M%S)
```

→ Show me: "✅ Backup branch created: backup-extension-before-rebase-XXXXX"
→ This means if ANYTHING goes wrong, we can restore from this backup.

**Step 2.2** - Verify backup exists

```bash
git branch | grep backup
```

→ Must show the backup branch. Do NOT proceed without this confirmation.

---

### PHASE 3: FETCH LATEST (Safe, read-only)

**Step 3.1** - Fetch from remote

```bash
git fetch origin
```

→ This only downloads, changes nothing locally.

**Step 3.2** - Show me what we're dealing with

```bash
git log --oneline HEAD..origin/main | head -20
```

→ Show me: "Main has X commits that you don't have"

---

### PHASE 4: REBASE (Here be dragons 🐉)

**Step 4.1** - BEFORE starting, confirm with me:

Show this message:

```
⚠️ REBASE WARNING ⚠️

I'm about to run: git rebase origin/main

This will:
- Replay your 1 commit on top of the latest main
- May cause conflicts on 9 files
- Is reversible using the backup branch

Type "YES START REBASE" to proceed, or "STOP" to abort.
```

**Step 4.2** - Start rebase (ONLY if I said "YES START REBASE")

```bash
git rebase origin/main
```

---

### PHASE 5: CONFLICT RESOLUTION

For EACH conflict that appears:

**Step 5.1** - Show me the conflicting file

```bash
git diff --name-only --diff-filter=U
```

**Step 5.2** - For each conflicting file, show me BOTH versions:

```bash
echo "=== YOUR VERSION (HEAD) ==="
git show :2:<filename> | head -50

echo "=== MAIN'S VERSION ==="  
git show :3:<filename> | head -50
```

**Step 5.3** - Apply resolution rules:

| File Pattern | Action | Command |
|--------------|--------|---------|
| `extension/*` | Keep MINE | `git checkout --ours <file>` |
| `backend/*` | Keep MAIN | `git checkout --theirs <file>` |
| `dashboard/src/features/compliance/*` | Keep MAIN | `git checkout --theirs <file>` |
| `App.tsx` | STOP | Ask me to decide |
| `package-lock.json` | Delete | `rm <file>` |
| `FUTURE_IDEAS.md` | Manual | Show both, I merge |

**Step 5.4** - After resolving each file:

```bash
git add <resolved-file>
```

**Step 5.5** - Show me status after each resolution:

```bash
git status
```

→ Ask: "File X resolved. Continue to next conflict? (yes/no)"

**Step 5.6** - After ALL conflicts resolved:

```bash
git rebase --continue
```

**Step 5.7** - If rebase fails or gets stuck:

```
STOP! Something went wrong.
DO NOT try to fix it automatically.
Show me the error and ask Lucas for help.

Emergency restore command (DO NOT RUN WITHOUT LUCAS):
git rebase --abort
git checkout backup-extension-before-rebase-XXXXX
```

---

### PHASE 6: VERIFY SUCCESS

**Step 6.1** - Check rebase completed

```bash
git status
git log --oneline -5
```

→ Should show clean status and my commit on top of main's commits

**Step 6.2** - Verify my files still exist

```bash
ls -la extension/src/components/
ls -la extension/src/contents/
ls -la extension/src/lib/
```

→ All my files must be there. If ANY are missing → STOP and restore backup.

**Step 6.3** - Quick test

```bash
cd extension && npm install && npm run build
```

→ Must succeed. If build fails → STOP and ask me.

---

### PHASE 7: PUSH (Point of no return)

**Step 7.1** - Final confirmation

Show this message:

```
🚨 FORCE PUSH CONFIRMATION 🚨

Everything looks good. Ready to push.

This will OVERWRITE your remote extension branch.
Your backup branch is: backup-extension-before-rebase-XXXXX

To proceed, type exactly: "YES, FORCE PUSH NOW"
To abort, type: "STOP"
```

**Step 7.2** - Force push (ONLY if I typed "YES, FORCE PUSH NOW")

```bash
git push origin extension --force-with-lease
```

(Using --force-with-lease is safer than --force)

**Step 7.3** - Confirm success

```bash
git log origin/extension --oneline -3
```

→ Show me: "✅ Push successful. Your branch is now synced."

---

### PHASE 8: CLEANUP

**Step 8.1** - Restore stashed changes (if any)

```bash
git stash list
```

If there was a stash from Step 1.2:

```bash
git stash pop
```

**Step 8.2** - Final message

```
✅ REBASE COMPLETE

Your extension branch is now up-to-date with main.
Backup branch still exists: backup-extension-before-rebase-XXXXX

You can delete the backup after verifying everything works:
git branch -d backup-extension-before-rebase-XXXXX

If anything is wrong, restore with:
git checkout backup-extension-before-rebase-XXXXX
git branch -D extension
git checkout -b extension
```

---

## 🆘 EMERGENCY PROCEDURES

### If rebase goes wrong:

```bash
git rebase --abort
git checkout backup-extension-before-rebase-XXXXX
git branch -D extension
git checkout -b extension
```

### If you accidentally deleted files:

```bash
git checkout backup-extension-before-rebase-XXXXX -- extension/
```

### If push failed:

DO NOT retry. Ask Lucas.

### If ANYTHING unexpected happens:

1. STOP immediately
2. Run `git status`
3. Screenshot everything
4. Contact Lucas before doing ANYTHING else

---

## START NOW

Begin with Phase 1, Step 1.1. Show me the output of:

```bash
git status && git branch && git stash list
```

Do NOT proceed to any other step until I confirm.
