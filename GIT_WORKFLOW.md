# Hackathon Git Workflow Guide

## Summary

For our 2-3 person beginner team doing parallel feature work over a weekend, we use a **Simple Feature Branch** workflow. This keeps everyone out of each other's way while staying easy to learn.

---

## Branch Strategy

```
main (always working/demo-ready)
  │
  ├── feat/auth-login      (Alice's feature)
  ├── feat/dashboard-ui    (Bob's feature)  
  └── feat/api-endpoints   (Carol's feature)
```

**Rules:**

- `main` = always deployable, never broken
- Each person works on their own `feat/` branch
- Merge back to `main` when your feature works
- Delete your branch after merging

---

## Branch Naming Convention

Keep it simple and consistent:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/user-login` |
| Fix | `fix/what-broke` | `fix/button-crash` |
| Experiment | `exp/idea-name` | `exp/ai-chat` |

**Tips:**

- Use lowercase and hyphens (no spaces)
- Keep names short (2-4 words max)
- Include your name if needed: `feat/alice-auth`

---

## Visual Branch Flow

```
main:     ●───●───●───────●───────●───●
               \         /       /
feat/login:     ●───●───●       /
                               /
feat/dashboard:     ●───●─────●
```

---

## Daily Workflow Steps

### Morning Standup Routine

1. Everyone pulls latest `main`
2. Quick sync: "I'm working on X today"
3. Check for any conflicts in shared files

### While Working

1. Commit often (every 30-60 min or after each small win)
2. Push your branch frequently (backup + visibility)
3. Pull `main` into your branch 1-2x per day to stay current

### Before Merging

1. Pull latest `main` into your branch
2. Test that everything still works
3. If risky: create a PR and ask for a quick review
4. If safe: merge directly to `main`

---

## Example Git Commands

### Starting a New Feature

```bash
# Make sure you're on main and up-to-date
git checkout main
git pull origin main

# Create and switch to your feature branch
git checkout -b feat/your-feature-name
```

### Working on Your Feature

```bash
# Stage and commit your changes
git add .
git commit -m "Add login form UI"

# Push your branch to GitHub
git push origin feat/your-feature-name
```

### Staying Up-to-Date (Do This 1-2x Daily)

```bash
# While on your feature branch, pull in latest main
git pull origin main

# If conflicts: resolve them, then
git add .
git commit -m "Merge main, resolve conflicts"
```

### Merging Your Feature (Direct Merge)

```bash
# Switch to main
git checkout main
git pull origin main

# Merge your feature
git merge feat/your-feature-name
git push origin main

# Clean up: delete the branch
git branch -d feat/your-feature-name
git push origin --delete feat/your-feature-name
```

### Merging via Pull Request (For Risky Changes)

```bash
# Push your branch
git push origin feat/your-feature-name

# Then on GitHub: Create Pull Request → Request review → Merge
```

---

## Emergency Rollback

If `main` breaks after a bad merge:

```bash
# Option 1: Revert the last merge (safest for beginners)
git checkout main
git pull origin main
git revert -m 1 HEAD
git push origin main

# Option 2: Reset to a known good commit (more advanced)
git checkout main
git log --oneline          # Find the good commit hash
git reset --hard abc1234   # Replace with actual hash
git push origin main --force-with-lease
```

**Beginner tip:** Option 1 (revert) is safer - it creates a new commit that undoes the bad one.

---

## Commit Message Style

Keep it simple - use present tense, be descriptive:

```
Add user login form
Fix crash on empty input
Update API endpoint for dashboard
Remove unused auth code
```

Avoid vague messages like "fix stuff" or "updates".

---

## Team Rules Checklist

### Before You Start

- [ ] Clone the repo
- [ ] Set up your Git identity: `git config user.name "Your Name"`
- [ ] Agree on who owns which features/files

### Daily Habits

- [ ] Pull `main` at start of day
- [ ] Work only on your own feature branch
- [ ] Commit every 30-60 minutes
- [ ] Push your branch before lunch and end of day
- [ ] Pull `main` into your branch 1-2x daily

### Before Merging

- [ ] Pull latest `main` into your branch
- [ ] Test that your feature works
- [ ] If touching shared files: give teammates a heads up
- [ ] For risky changes: create a PR for quick review

### Communication

- [ ] Announce in Slack/Discord when you merge to `main`
- [ ] If you break something: tell the team immediately
- [ ] Coordinate if two people need to edit the same file

---

## Avoiding Conflicts (The Golden Rules)

1. **Own your territory** - Each person works on different files when possible
2. **Pull often** - Sync with `main` at least twice a day
3. **Push often** - Share your work early, don't hoard changes
4. **Small commits** - Easier to review and less likely to conflict
5. **Communicate** - Tell teammates before editing shared files

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Start feature | `git checkout -b feat/name` |
| Save work | `git add . && git commit -m "message"` |
| Push branch | `git push origin feat/name` |
| Get updates | `git pull origin main` |
| Switch branch | `git checkout branch-name` |
| Merge to main | `git checkout main && git merge feat/name` |
| Delete branch | `git branch -d feat/name` |
| See all branches | `git branch -a` |
| See status | `git status` |
| See history | `git log --oneline` |
