# TODO — Agentic Studio

## Status Legend
- [ ] Pending
- [x] Completed

---

## One-Time Setup

### System Prerequisites
- [x] Install Node.js 20+
- [x] Install git, jq, tmux
- [ ] Install VS Code extensions: Kilo Code, Blackbox AI, Continue.dev
- [ ] Run `bash scripts/setup-env.sh`
- [ ] Add `GEMINI_API_KEY` to `~/.bashrc`
- [ ] Authenticate Gemini API key works: `gemini -p "test"`

### Studio Initialization
- [x] Create `~/agentic-studio/` directory structure
- [x] Create agent definitions in `agents/`
- [x] Create Kilo Code agent prompts in `.vscode/kilocode-agents/`
- [x] Create `.vscode/settings.json` with free-tier config
- [x] Create `scripts/daily-loop.sh` (Ralph Loop orchestrator)
- [x] Create `business/daily-scout.sh` (Gemini job scout)
- [x] Create `templates/tasks.json` (backlog template)
- [x] Create `deploy/render.yaml` (Render free-tier config)
- [x] Initialize git repo in `~/agentic-studio/`

---

## First Project: My SaaS

### Project Setup
- [ ] Create `projects/my-saas/` directory
- [ ] Copy `.vscode/kilocode-agents/*.md` into project
- [ ] Copy `.vscode/settings.json` into project
- [ ] Create `CLAUDE.md` with project context
- [ ] Create `tasks.json` with first 3-5 tasks
- [ ] Initialize git, make first commit

### First Tasks (tasks.json)
- [ ] T001: Scaffold Next.js app with Tailwind + shadcn (DevOps)
- [ ] T002: Design database schema for users + subscriptions (Architect)
- [ ] T003: Implement auth with NextAuth.js (Developer)
- [ ] T004: Create landing page design system (Designer)
- [ ] T005: Write E2E tests for auth flow (Tester)
- [ ] T006: Deploy to Vercel + Render (DevOps)

---

## Daily Workflow

### Morning Routine
- [ ] Run business scout: `bash ~/agentic-studio/business/daily-scout.sh`
- [ ] Review `business/leads/INDEX_YYYY-MM-DD.md`
- [ ] Approve/reject outreach emails
- [ ] Check Kilo Code Agent Manager for overnight runs

### Development Loop
- [ ] Open project in VS Code: `code ~/agentic-studio/projects/my-saas`
- [ ] Run Ralph Loop: `bash ../../scripts/daily-loop.sh .`
- [ ] Spawn Kilo Code session for current task
- [ ] Complete task, run tests, confirm in terminal
- [ ] Task auto-commits, move to next
- [ ] When prompted, generate social content for completed project
- [ ] Repeat until backlog empty

### Social Content (auto-triggered)
- [ ] Review drafts in `business/queue/`
- [ ] Edit in your voice — keep it human, specific, short
- [ ] Post manually to LinkedIn / Twitter / Instagram
- [ ] Move posted files to `business/posted/`

### End of Day
- [ ] Update `tasks.json` with any new tasks discovered
- [ ] Commit any unfinished work
- [ ] Push to remote: `git push origin main`

---

## Weekly Tasks

### Code Quality
- [ ] Review all open pull requests
- [ ] Run full test suite
- [ ] Check `npm audit` for vulnerabilities
- [ ] Update dependencies if safe
- [ ] Enforce brevity: delete dead code, remove unused imports, shorten functions

### Business Development
- [ ] Review weekly leads from `business/leads/`
- [ ] Send approved outreach emails
- [ ] Update portfolio with latest projects
- [ ] Tailor resume for top 3 matches
- [ ] Generate social content for shipped projects
- [ ] Post to LinkedIn/Twitter/Instagram manually from `business/queue/`

### Infrastructure
- [ ] Check Vercel / Render deployment logs
- [ ] Verify free-tier limits not exceeded
- [ ] Back up PostgreSQL database if needed
- [ ] Review API key usage (Gemini, etc.)

---

## Monthly Tasks

### System Maintenance
- [ ] Rotate API keys (Gemini, etc.)
- [ ] Review Kilo Code / Blackbox free-tier usage
- [ ] Update agent prompts if tool behavior changed
- [ ] Clean up old git branches and worktrees

### Project Review
- [ ] Audit completed tasks in `tasks.json`
- [ ] Archive finished projects to `projects/archive/`
- [ ] Plan next project features
- [ ] Update portfolio site

---

## When to Use Which Tool

```
New task
  │
  ├─ Coding / Architecture? → Kilo Code
  │     │
  │     ├─ Simple? → Code mode (free auto-model)
  │     ├─ Design/Architecture? → Architect mode
  │     ├─ Testing/Debugging? → Debug mode
  │     └─ Complex/uncertain? → Blackbox AI Chairman
  │
  └─ Business / Marketing? → Gemini REST API
        │
        ├─ Job search? → daily-scout.sh
        ├─ Cover letter? → Gemini direct call
        ├─ Outreach? → Gemini + templates/outreach-templates.md
        └─ Social content? → content-generator.sh → review in queue/ → manual post
```

---

## Quick Reference Commands

```bash
# Setup
bash ~/agentic-studio/scripts/setup-env.sh
source ~/.bashrc

# New project
cd ~/agentic-studio/projects
mkdir my-app && cd my-app
cp ../.vscode/kilocode-agents/*.md .vscode/
cp ../.vscode/settings.json .vscode/
git init && git add -A && git commit -m "chore: init"

# Daily loop
cd ~/agentic-studio/projects/my-app
bash ../../scripts/daily-loop.sh .

# Business scout
bash ~/agentic-studio/business/daily-scout.sh

# Git workflow
git checkout -b feature/task-name
# ... work ...
git add -A && git commit -m "feat: complete T001"
git checkout main && git merge feature/task-name

# Deploy
vercel --prod
```

---

## Known Issues / Limitations

- [ ] Gemini free tier: 15 RPM limit may slow bulk job scraping
- [ ] Kilo Code free auto-model may downgrade too aggressively for complex tasks
- [ ] Blackbox AI free tier has daily credit limits
- [ ] Render free DB spins down after inactivity (1 min cold start)
- [ ] No persistent agent memory between sessions without manual context passing
- [ ] Social content drafts need human review — auto-posting violates platform TOS

---

## Ideas for Later

- [ ] Add MCP server for PostgreSQL direct queries
- [ ] Add MCP server for browser automation (Playwright)
- [ ] Integrate GitHub Actions for CI/CD
- [ ] Add monitoring dashboard (Grafana + Prometheus free tier)
- [ ] Create project templates for common stacks (SaaS, e-commerce, blog)
- [ ] Add automated portfolio deployment from `projects/` data
