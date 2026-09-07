# Agentic Studio

**A fully autonomous development system running on free tiers.**

**Stack:** Kilo Code (VS Code) + Blackbox AI + Gemini REST API
**Cost:** $0/month
**OS:** Linux / macOS / WSL

---

## What This Is

A "virtual dev company" where specialized agents handle architecture, coding, design, testing, deployment, and business development. You are the project manager. The agents do the work.

**Agents:**
- **Architect** — designs systems, schemas, API contracts
- **Developer** — implements features, writes tests, fixes bugs
- **Designer** — creates design systems, wireframes, component specs
- **Tester** — writes tests, audits security, reports bugs
- **DevOps** — CI/CD, free-tier deployment, secrets management
- **Business Dev** — job scouting, tailored applications, outreach
- **Project Manager** — task routing, dependency management, validation

---

## Folder Structure

```
agentic-studio/
├── agents/                        # Generic agent personas (tool-agnostic)
│   ├── architect.md               # Senior System Architect persona
│   ├── developer.md               # Full-Stack Developer persona
│   ├── designer.md                # UI/UX Designer persona
│   ├── tester.md                  # QA Engineer persona
│   ├── devops.md                  # Deployment Engineer persona
│   ├── business.md                # Growth & Sales Engineer persona
│   └── project-manager.md         # Engineering Lead & Orchestrator persona
│
├── .vscode/
│   ├── settings.json              # VS Code + Kilo Code configuration
│   └── kilocode-agents/           # Kilo Code-specific agent prompts
│       ├── architect.md           # → Architect mode
│       ├── developer.md           # → Code mode
│       ├── designer.md            # → Code mode
│       ├── tester.md              # → Debug mode
│       ├── devops.md              # → Code mode
│       ├── business.md            # → Architect mode
│       └── project-manager.md     # → Architect mode
│
├── business/                      # Business automation layer
│   ├── daily-scout.sh             # Daily job scout (Gemini REST API)
│   ├── gemini-cli-guide.md        # Gemini API configuration reference
│   ├── job-scout.js               # Legacy Node.js scout (deprecated)
│   ├── outreach-templates.md      # Cold email templates
│   ├── portfolio-generator.md     # Portfolio site generation prompt
│   ├── content-generator.sh       # Generates social drafts for project launches
│   ├── portfolio-updater.sh       # Auto-updates portfolio data from projects/
│   ├── human-style-guide.md       # /human rules for natural social copy
│   ├── drafts/                    # Freshly generated content (move to queue/)
│   ├── queue/                     # Review queue before posting
│   ├── posted/                    # Archived posted content
│   ├── leads/                     # Generated job leads
│   │   └── INDEX_YYYY-MM-DD.md    # Daily leads index
│   ├── applications/              # Tailored cover letters
│   └── outreach/                  # Cold outreach emails
│
├── deploy/
│   └── render.yaml                # Render free-tier infrastructure config
│
├── projects/                      # Your actual projects go here
│   └── <project-name>/
│       ├── .vscode/
│       │   ├── settings.json      # Copied from root .vscode/settings.json
│       │   └── kilocode-agents/   # Copied from root .vscode/kilocode-agents/
│       ├── src/                   # Source code
│       ├── tests/                 # Test files
│       ├── docs/                  # Architecture and design docs
│       ├── deploy/                # Deployment configs
│       ├── business/leads/        # Project-specific leads (optional)
│       ├── CLAUDE.md              # Project context for agents
│       └── tasks.json             # Ralph Loop backlog
│
├── scripts/
│   ├── daily-loop.sh              # Ralph Loop orchestrator (main entry point)
│   └── setup-env.sh               # One-time environment setup
│
├── templates/
│   └── tasks.json                 # Task backlog template for new projects
│
├── SETUP.md                       # Complete setup guide
├── README.md                      # This file
└── TODO.md                        # Actionable checklist
```

---

## How It Works

### Runtime Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. You run: bash scripts/daily-loop.sh <project>           │
│     ↓                                                       │
│  2. Script reads tasks.json, picks next ready task          │
│     (respects dependencies, blocks unfinished prerequisites) │
│     ↓                                                       │
│  3. Script prints instructions:                             │
│     "Open Kilo Code → [mode] → work on T001"               │
│     ↓                                                       │
│  4. YOU do the work in VS Code / Kilo Code                  │
│     - Architect mode for design tasks                       │
│     - Code mode for implementation                          │
│     - Debug mode for testing                                │
│     ↓                                                       │
│  5. You confirm completion back in the terminal             │
│     ↓                                                       │
│  6. Script marks task done, commits to git                  │
│     ↓                                                       │
│  7. Repeat until backlog is empty                           │
└─────────────────────────────────────────────────────────────┘

Parallel work:
  - Open multiple Kilo Code Agent Manager sessions
  - Each session works on an independent task
  - Git worktrees prevent file conflicts
  - Blackbox AI for quality review of hard decisions
```

### Tool Routing

| Task Type | Tool | Mode | Cost |
|-----------|------|------|------|
| Architecture / Design | Kilo Code | Architect | $0 |
| Implementation | Kilo Code | Code | $0 |
| Testing / Debugging | Kilo Code | Debug | $0 |
| Deployment | Kilo Code + Terminal | Code | $0 |
| Hard decisions / Review | Blackbox AI | Chairman | $0 |
| Job search / Outreach | Gemini REST API | — | $0 |

---

## Key Files Explained

### agents/*.md
Generic agent personas. These describe *what* each agent does, independent of which tool implements it. Copy these into any project as reference docs.

### .vscode/kilocode-agents/*.md
Kilo Code-specific prompt files. Each maps to a Kilo Code mode:
- `architect.md` → Architect mode
- `developer.md`, `designer.md`, `devops.md` → Code mode
- `tester.md` → Debug mode
- `business.md`, `project-manager.md` → Architect mode

When you start a new project, copy these into `.vscode/kilocode-agents/` inside that project.

### .vscode/settings.json
Kilo Code configuration:
- `kilo.modelTier: "free"` — auto-routes to free models
- `kilo.parallelAgents: true` — enables parallel sub-agents
- `kilo.gitWorktrees: true` — isolates agent work in separate branches
- `kilo.mcpServers` — adds Postgres, Puppeteer, Filesystem MCP servers
- `kilo.agentPrompts` — maps agent names to prompt files

### scripts/daily-loop.sh
The **main entry point** for development work. It:
1. Reads `tasks.json` from the current project
2. Finds the next task with satisfied dependencies
3. Prints instructions for which Kilo Code mode to use
4. Waits for your confirmation
5. Marks task done and commits

Usage:
```bash
cd ~/agentic-studio/projects/my-saas
bash ../../scripts/daily-loop.sh .
```

### scripts/setup-env.sh
One-time setup script. Adds `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and `CLAUDE_CODE_NO_FLICKER=1` to your shell rc. Run once after cloning this repo.

### business/daily-scout.sh
Daily job scout using Gemini REST API. It:
1. Calls Gemini to find remote full-stack roles
2. Scores each role against your tech stack
3. Generates tailored cover letters and outreach emails
4. Writes results to `business/leads/`, `business/applications/`, `business/outreach/`

Requires `GEMINI_API_KEY` environment variable.

### business/outreach-templates.md
Copy-paste cold outreach templates. Customize for your voice.

### business/portfolio-generator.md
Prompt template for generating a portfolio site. Feed this to any agent with your project data.

### business/content-generator.sh
Generates social content drafts when you ship a project. Outputs:
- LinkedIn post
- Twitter/X thread
- Instagram caption
- Blog outline

All drafts go to `business/queue/` for human review before posting.

### business/portfolio-updater.sh
Syncs `projects/*/project.json` into `business/portfolio-data.json`. Run after shipping a project to keep portfolio data current.

### business/human-style-guide.md
Rules for AI-generated social content: be specific, show don't tell, avoid jargon soup, limit hashtags, include real details. Keeps posts from sounding like marketing bots.

### scripts/on-task-complete.sh
Wrapper that triggers `content-generator.sh` after a task is marked done in `daily-loop.sh`. Optional step in the Ralph Loop.

### business/queue/
Draft social posts generated by Gemini. Review here before posting.

### business/posted/
Archive of content you've already published. Move files here after posting.

### deploy/render.yaml
Infrastructure-as-code for Render free tier. Defines a web service + PostgreSQL database.

### templates/tasks.json
Template backlog for new projects. Copy this into any new project's root and fill in your tasks.

### SETUP.md
Complete setup instructions: prerequisites, VS Code extensions, Kilo Code config, Gemini CLI auth, first project creation.

---

## How to Start a New Project

```bash
# 1. Create project directory
cd ~/agentic-studio/projects
mkdir my-app && cd my-app
git init

# 2. Create Kilo Code-aware structure
mkdir -p .vscode src tests docs deploy business/leads

# 3. Copy agent configs from studio root
cp ../../.vscode/kilocode-agents/*.md .vscode/
cp ../../.vscode/settings.json .vscode/

# 4. Create project context
cat > CLAUDE.md << 'EOF'
# Project Name

## Overview
[One paragraph]

## Tech Stack
- Frontend: Next.js 14 + Tailwind + shadcn/ui
- Backend: Next.js API Routes
- Database: PostgreSQL (Neon free tier)
- Auth: NextAuth.js
- Deploy: Vercel + Render

## Agent Routing
- Architecture → Kilo Code Architect mode
- Code → Kilo Code Code mode
- Testing → Kilo Code Debug mode
- Business → Gemini REST API
EOF

# 5. Create task backlog
cp ../../templates/tasks.json .
# Edit tasks.json with your actual tasks

# 6. First commit
git add -A && git commit -m "chore: init project"
```

---

## Daily Workflow

```bash
# Morning: business automation
bash ~/agentic-studio/business/daily-scout.sh

# Development: run the Ralph Loop
cd ~/agentic-studio/projects/my-app
bash ../../scripts/daily-loop.sh .
# Follow the printed instructions in Kilo Code
# Confirm when done
# When prompted, generate social content for the completed project
# Repeat
```

---

## Social Content Workflow

When you complete a project task, the system auto-generates platform-optimized drafts:

```bash
# Option 1: Auto-triggered from daily-loop.sh
# When you mark a task done, it asks: "Generate social content?"
# Answer y, enter project name/desc/tech
# Drafts appear in business/queue/

# Option 2: Manual generation
bash ~/agentic-studio/business/content-generator.sh \
  "My Project" \
  "A full-stack app with real-time features" \
  "Next.js, PostgreSQL, Tailwind"

# Option 3: Batch update portfolio
bash ~/agentic-studio/business/portfolio-updater.sh
```

**What gets generated:**
- LinkedIn post (casual, specific, <300 words)
- Twitter/X thread (5-7 tweets, hook-first)
- Instagram caption (visual, <2200 chars, question CTA)
- Blog outline (500 words, practical tone)

**Style rules:**
- Short sentences, one idea per line
- Specific details over vague claims
- No jargon soup, no emoji spam
- 2-3 hashtags max
- Ends with a question or CTA
- See `business/human-style-guide.md` for full rules

**Workflow:**
1. Drafts land in `business/queue/`
2. You review and edit in your voice
3. You post manually to each platform
4. Move posted files to `business/posted/`

**Why manual posting?** LinkedIn/Instagram/X block automation. This keeps you safe and the content human.

---

## Cost Breakdown

| Component | Tool | Cost | Limits |
|-----------|------|------|--------|
| AI Coding | Kilo Code Free | $0 | Unlimited base requests, auto free models |
| Agent Orchestration | Kilo Code Agent Manager | $0 | Parallel sessions, git worktrees |
| Quality Fallback | Blackbox AI | $0 | Free tier, Chairman dispatch |
| Business Automation | Gemini REST API | $0 | 15 RPM, 1M tokens/min |
| Frontend Hosting | Vercel Hobby | $0 | 100GB bandwidth |
| Backend + DB | Render Free | $0 | Spins down after inactivity |
| Database | Neon / Supabase Free | $0 | 500MB-1GB storage |
| Auth | NextAuth.js / Clerk Free | $0 | 5k MAU |
| Email | Resend Free | $0 | 100 emails/day |

**Total: $0/month**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Kilo Code uses premium models | Set `"kilo.modelTier": "free"` in `.vscode/settings.json` |
| Parallel agents conflict | Enable `"kilo.gitWorktrees": true` |
| Gemini rate limit | Batch prompts, use `--output-format json` |
| Blackbox free tier exhausted | Use Kilo Code free tier instead |
| Render DB spins down | Use Neon or Supabase for always-on free DB |
| Vercel build fails | Set `output: 'standalone'` in `next.config.js` |

---

## Pro Tips

1. **Kilo Code Free Auto Model** automatically downgrades to free models for simple tasks. Never manually switch unless you need to.
2. **Blackbox Chairman** is for your single hardest architectural decision per day. Use it sparingly.
3. **Gemini bulk generation** — 1,000 reqs/day is enough for daily job scouting + outreach + social content.
4. **Git worktrees** are mandatory for parallel agent work. Without them, agents overwrite each other's files.
5. **tasks.json is your source of truth.** Update it after every session. If a task is blocked, mark it and move on.
6. **Code brevity first.** Write the shortest correct solution. Delete dead code. Shorter code is faster to ship and easier to debug.
7. **Social content = review then post.** Gemini generates drafts in `business/queue/`. You edit for your voice, then post manually. Never auto-post.

---

## Next Steps

1. Run `bash scripts/setup-env.sh` (if not done)
2. Create your first project in `projects/`
3. Copy Kilo Code configs into the project
4. Fill in `tasks.json` with your first 3-5 tasks
5. Run `bash scripts/daily-loop.sh .` and start building
6. Set up `business/daily-scout.sh` cron for daily job scouting
7. When you ship a project, run `bash business/content-generator.sh` to generate social drafts

---

Built for the $0 startup generation.
