# $0 Agentic Development System — Setup Guide

**Stack:** Kilo Code (VS Code) + Blackbox AI + Gemini CLI
**Cost:** $0 forever (within free tier limits)
**OS:** Linux (tested on Ubuntu/Debian)

---

## Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+ (required for CLI tools)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git jq tmux

# Verify
node -v  # Should be v20+
npm -v
git --version
jq --version
```

---

## Step 1: Install VS Code Extensions

Open VS Code and install these extensions:

1. **Kilo Code** — Primary dev agent team
2. **Blackbox AI** — Quality fallback / multi-model judge
3. **Continue.dev** — Backup / local model bridge (optional)

---

## Step 2: Configure Kilo Code

1. Open VS Code
2. Install Kilo Code extension
3. Open settings: `Ctrl+Shift+P` → "Preferences: Open Settings (JSON)"
4. Paste the contents of `.vscode/settings.json` from this repo
5. Set `kilo.modelTier` to `"free"` (auto-routes to free models)
6. Enable `kilo.parallelAgents` and `kilo.gitWorktrees`

**Agent Prompts:** Kilo Code will use the files in `.vscode/kilocode-agents/`:
- `architect.md` → Architect mode
- `developer.md` → Code mode
- `designer.md` → Code mode
- `tester.md` → Debug mode
- `devops.md` → Code mode
- `business.md` → Architect mode
- `project-manager.md` → Architect mode

---

## Step 3: Install Gemini CLI (Business Automation)

```bash
npm install -g @google/gemini-cli
gemini auth login
# Follow the OAuth flow in your browser
```

**Free tier:** 1,000 requests/day, 60 RPM, 1M tokens/min.

---

## Step 4: Install Blackbox AI (Optional Fallback)

1. Install **Blackbox AI** extension in VS Code
2. Sign up at https://www.blackbox.ai (free, no CC)
3. Enable **CyberCoder agent** in settings
4. Use for: "Review this architecture and pick the best approach"

---

## Step 5: Clone / Initialize Your Agentic Studio

```bash
# If starting fresh:
mkdir -p ~/agentic-studio/{projects,agents,templates,deploy,business/leads,scripts}
cd ~/agentic-studio
git init

# Copy agent definitions from this repo into place:
# - agents/*.md → your existing agent definitions
# - .vscode/kilocode-agents/*.md → Kilo Code agent prompts
# - .vscode/settings.json → VS Code settings
# - templates/tasks.json → Ralph Loop backlog template
# - scripts/daily-loop.sh → Orchestration script
# - business/daily-scout.sh → Gemini job scout
# - deploy/render.yaml → Render free-tier config
```

---

## Step 6: Start Your First Project

```bash
cd ~/agentic-studio/projects
mkdir saas-starter && cd saas-starter
git init

# Create Kilo Code-aware structure
mkdir -p .vscode src tests docs deploy business/leads

# Copy agent prompts into project
cp ../../.vscode/kilocode-agents/*.md .vscode/
cp ../../.vscode/settings.json .vscode/

# Create project source of truth
cat > CLAUDE.md << 'EOF'
# Project: My SaaS Starter

## Overview
[One paragraph describing the project]

## Tech Stack
- Frontend: Next.js 14 + Tailwind + shadcn/ui
- Backend: Next.js API Routes / Node.js
- Database: PostgreSQL (Neon free tier)
- Auth: NextAuth.js
- Deploy: Vercel (frontend) + Render (API/DB)

## Architecture Decisions
[Link to docs/architecture.md once created]

## Environment Variables
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL

## Agent Routing (Kilo Code Modes)
- Architecture questions → Architect mode
- UI/UX questions → Designer mode
- Code implementation → Developer mode
- Testing → Tester (Debug) mode
- Deployment → DevOps mode
- Business growth → Business-Dev mode
EOF

# Create tasks template
cat > tasks.json << 'EOF'
{
  "project": "saas-starter",
  "backlog": [
    {
      "id": "T001",
      "title": "Set up Next.js project with shadcn",
      "agent": "devops",
      "status": "todo",
      "depends_on": [],
      "acceptance": ["Project builds", "Dev server starts", "Git initialized"]
    },
    {
      "id": "T002",
      "title": "Design database schema for users and posts",
      "agent": "architect",
      "status": "todo",
      "depends_on": ["T001"],
      "acceptance": ["Schema documented", "Migration files created", "Indexes defined"]
    }
  ]
}
EOF

git add -A && git commit -m "chore: init project with Kilo Code agent configs"
```

---

## Step 7: Run Your Daily Agent Loop

### Option A: Inside VS Code / Kilo Code (Recommended)

1. Open the project in VS Code
2. Open Kilo Code panel
3. Start parallel sessions:
   - Session 1: "Architect — Design auth schema for SaaS"
   - Session 2: "Designer — Create landing page component spec"
   - Session 3: "DevOps — Set up Vercel + Render deployment config"

Kilo Code will spawn parallel sub-agents using git worktrees. Each agent works in isolation.

### Option B: Terminal Script

```bash
bash ~/agentic-studio/scripts/daily-loop.sh ~/agentic-studio/projects/saas-starter
```

This launches Claude Code (if you have it) or you can adapt it to use Kilo Code CLI commands.

---

## Step 8: Business Automation (Gemini CLI)

Set up a cron job for daily job scouting:

```bash
crontab -e
# Add:
0 9 * * * /home/nishantk/agentic-studio/business/daily-scout.sh >> /home/nishantk/agentic-studio/business/scout.log 2>&1
```

This runs every morning at 9 AM and generates:
- Scored job leads in `business/leads/`
- Tailored cover letters in `business/applications/`
- Cold outreach emails in `business/outreach/`

---

## Step 9: Deploy to Free Tier

### Vercel (Frontend)
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Render (Backend + DB)
1. Push code to GitHub
2. Go to https://dashboard.render.com → New Web Service
3. Connect GitHub repo
4. Use `deploy/render.yaml` for infra-as-code
5. Add environment variables in Render dashboard

### Free Domains
- Vercel: `yourproject.vercel.app`
- Render: `yourproject.onrender.com`
- js.org: `yourproject.js.org` (for JS projects)

---

## Tool Decision Tree

```
New task
  │
  ├─ Coding / Architecture? → Kilo Code (Free tier)
  │     │
  │     ├─ Complex architecture? → Blackbox AI Chairman (free tier)
  │     └─ Simple implementation? → Kilo Code Code mode (free tier)
  │
  └─ Business / Marketing? → Gemini CLI (1,000 reqs/day free)
```

---

## Cost Breakdown

| Component | Tool | Cost | Limits |
|-----------|------|------|--------|
| **AI Coding** | Kilo Code Free | **$0** | Unlimited base requests, auto-routes to free models |
| **Agent Orchestration** | Kilo Code Agent Manager | **$0** | Parallel sub-agents, git worktrees |
| **Quality Fallback** | Blackbox AI | **$0** | Free tier with Chairman dispatch |
| **Business Automation** | Gemini CLI | **$0** | 1,000 reqs/day |
| **Frontend Hosting** | Vercel Hobby | **$0** | 100GB bandwidth |
| **Backend + DB** | Render Free | **$0** | Spins down after inactivity |
| **Edge Functions** | Cloudflare Workers | **$0** | 100k requests/day |
| **Database** | Neon/Supabase Free | **$0** | 500MB-1GB storage |
| **Auth** | NextAuth.js / Clerk Free | **$0** | 5k MAU |
| **Email** | Resend Free | **$0** | 100 emails/day |

**Total: $0/month**

---

## Pro Tips

1. **Kilo Code Free Auto Model** — Automatically downgrades to free models for simple tasks. Never hit a paywall.

2. **Blackbox for Hard Decisions** — Use Blackbox's free tier for your single most important architectural decision each day. Chairman architecture gives you Claude-quality output.

3. **Gemini CLI for Bulk Work** — 1,000 requests/day = 30,000/month. Generate tailored resumes, outreach emails, and portfolio copy in bulk.

4. **Git Worktrees = No Conflicts** — Kilo Code's worktree isolation means parallel agents can work on the same repo simultaneously.

5. **Always use tasks.json** — The Ralph Loop pattern (atomic tasks, dependencies, acceptance criteria) works with any tool. Don't skip it.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Kilo Code hits premium models | Set `"kilo.modelTier": "free"` in settings.json |
| Parallel agents conflict | Enable `"kilo.gitWorktrees": true` |
| Gemini CLI rate limit | Batch requests, use `--output-format json` for efficiency |
| Blackbox free tier exhausted | Use Kilo Code free tier instead |
| Render free DB spins down | Use Neon or Supabase for always-on free DB |
| Vercel build fails | Check `next.config.js` output: 'standalone' |

---

## What's Next

1. Create your first project with `tasks.json`
2. Run Kilo Code in Architect mode to design the system
3. Switch to Developer mode to implement
4. Use Tester (Debug) mode to validate
5. Deploy with DevOps mode
6. Run Gemini CLI daily-scout.sh for business opportunities

---

Built with ❤️ for the $0 startup generation.
