# Agentic Studio

**A fully autonomous development system running on free tiers.**

**Stack:** Kilo Code (VS Code) + Blackbox AI + Gemini REST API
**Cost:** $0/month
**Orchestrator:** `ORCHESTRATOR.md` (programmatic multi-agent system)

---

## What This Is

A "virtual dev company" where specialized agents handle architecture, coding, design, testing, deployment, and business development. You are the project manager. The agents do the work.

**Two modes of operation:**

1. **Programmatic Orchestrator** (NEW) — `node index.js run <config.json>`. Agents run as Node.js classes calling Gemini REST API directly. Parallel execution, shared context, watchdog, 5-level fallback. See `ORCHESTRATOR.md`.

2. **Manual Ralph Loop** (ORIGINAL) — `bash scripts/daily-loop.sh <project>`. Sequential task processing via Kilo Code in VS Code. See `scripts/daily-loop.sh`.

**Agents:**
- **Architect** — designs systems, schemas, API contracts
- **Developer** — implements features, writes tests, fixes bugs
- **Designer** — creates design systems, wireframes, component specs
- **Tester** — writes tests, audits security, reports bugs
- **DevOps** — CI/CD, free-tier deployment, secrets management
- **Business Dev** — job scouting, tailored applications, outreach
- **Project Manager** — task routing, dependency management, validation

---

## New: Programmatic Orchestrator

The orchestrator (`ORCHESTRATOR.md`) runs agents as Node.js classes with:
- **Parallel execution** — up to 3 agents working simultaneously
- **Shared context window** — all agents read/write to a SQLite store
- **Watchdog** — 5-second health checks detect stuck agents
- **5-level fallback** — retry → backup agent → decompose → escalate → skip

```bash
cd agentic-studio
npm install
node index.js run sample-project.json
```

See `ORCHESTRATOR.md` for full documentation.

---

## Folder Structure

```
agentic-studio/
├── ORCHESTRATOR.md                # Programmatic orchestrator docs
├── index.js                       # Orchestrator entry point
├── package.json                   # Orchestrator dependencies
├── orchestrator/                  # Core orchestration components
├── agents/                        # Agent implementations (JS classes + MD personas)
├── shared/                        # Context store, message bus, event emitter
├── fallback/                      # Retry, decompose, escalation, backup
├── output/                        # Project assembly, validation, packaging
├── config/                        # Agent, fallback, and project configs
├── lib/                           # LLM client wrapper
├── tests/                         # 36 tests (smoke, orchestrator, fallback, integration)
├── agents/                        # Generic agent personas (tool-agnostic)
│   ├── architect.md
│   ├── developer.md
│   ├── designer.md
│   ├── tester.md
│   ├── devops.md
│   ├── business.md
│   └── project-manager.md
│
├── .vscode/
│   ├── settings.json
│   └── kilocode-agents/
│
├── business/                      # Business automation layer
├── deploy/
├── projects/                      # Your actual projects go here
├── scripts/                       # Ralph Loop + setup scripts
├── templates/
└── SETUP.md
```

---

## How It Works

### Programmatic Mode (Recommended for parallel work)

```bash
# 1. Create a project config
node index.js run sample-project.json

# 2. Orchestrator spawns agents, executes tasks in parallel
# 3. Watchdog monitors health, fallback router handles failures
# 4. Output assembled, validated, and packaged
```

### Manual Mode (Original Ralph Loop)

```bash
cd ~/agentic-studio/projects/my-app
bash ../../scripts/daily-loop.sh .
```

See `ORCHESTRATOR.md` and `SETUP.md` for full documentation.

---

## Cost Breakdown

| Component | Tool | Cost | Limits |
|-----------|------|------|--------|
| AI Coding | Kilo Code Free | $0 | Unlimited base requests |
| Agent Orchestration | Node.js + Gemini | $0 | Free tier |
| Frontend Hosting | Vercel Hobby | $0 | 100GB bandwidth |
| Backend + DB | Render Free | $0 | Spins down after inactivity |
| Database | Neon / Supabase Free | $0 | 500MB-1GB storage |

**Total: $0/month**

---

## Testing

```bash
npm test
```

36 tests across 4 files covering orchestrator, fallback, and full pipeline integration.

---

Built for the $0 startup generation.