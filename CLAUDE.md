# Taxi Up Tax — Repo Conventions

## Git Workflow

**After every file change in this repo, commit and push immediately.**

- Commit message format: `[TaxiUp] {brief description of change}`
- Always run: `git add -A && git commit -m "..." && git push origin main`
- Never batch multiple unrelated changes into one commit

This rule is also enforced automatically by a `PostToolUse` hook in `.claude/settings.json` that runs after every `Edit`, `Write`, or `MultiEdit`. The hook is belt-and-suspenders: the rule above is the contract; the hook is the safety net.
