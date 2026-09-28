# Agentic Studio Orchestrator

Programmatic multi-agent orchestrator with shared context, watchdog monitoring, and 5-level fallback routing.

**Stack:** Node.js ESM + better-sqlite3 + Gemini REST API
**Cost:** $0/month (free tier)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  TASK QUEUE │──►│  AGENT POOL  │──►│   WATCHDOG     │  │
│  │  (deps,     │  │  (parallel,  │  │  (5s health    │  │
│  │   topo sort)│  │   load bal.) │  │   checks)      │  │
│  └─────────────┘  └──────┬───────┘  └───────┬────────┘  │
│                          │                  │           │
│                          ▼                  ▼           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              FALLBACK ROUTER (5-level)               │ │
│  │  RETRY → BACKUP_AGENT → DECOMPOSE → ESCALATE → SKIP │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                              │
│  ┌───────────────────────┴────────────────────────────┐ │
│  │              SHARED CONTEXT STORE (SQLite)          │ │
│  │  All agents read/write to a single source of truth  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Features

- **Parallel execution** — independent tasks run concurrently (up to 3 agents)
- **Shared context window** — all agents read/write to a SQLite-backed store
- **Dependency graph** — tasks execute in topological order, circular deps detected
- **Watchdog monitoring** — 5-second health checks detect stuck/timeout agents
- **5-level fallback** — retry → backup agent → decompose → escalate → skip
- **File-level locks** — prevents two agents from editing the same file
- **Message bus** — 8 message types for agent-to-agent communication
- **Event system** — structured events for monitoring and debugging

## Quick Start

```bash
# Install dependencies
npm install

# Check system status
node index.js status

# Run a project
node index.js run sample-project.json
```

## Project Config Format

```json
{
  "name": "my-app",
  "description": "Project description",
  "techStack": ["Node.js", "Next.js", "TypeScript"],
  "tasks": [
    {
      "id": "T001",
      "title": "Design database schema",
      "agent": "architect",
      "depends_on": [],
      "acceptance": ["Schema documented", "Migrations created"]
    },
    {
      "id": "T002",
      "title": "Implement auth API",
      "agent": "coder",
      "depends_on": ["T001"],
      "acceptance": ["Login works", "Session persists"]
    }
  ]
}
```

## Agent Roles

| Role | Class | Responsibilities |
|------|-------|-----------------|
| architect | `agents/architect-agent.js` | System design, schemas, API contracts |
| coder | `agents/coder-agent.js` | Feature implementation, tests |
| reviewer | `agents/reviewer-agent.js` | Code review, security audit |
| tester | `agents/tester-agent.js` | Test generation, bug reporting |
| docs | `agents/docs-agent.js` | README, API docs, setup guides |

## Fallback Chain

```
Level 1: RETRY           — Same agent, exponential backoff (2s → 4s → 8s)
Level 2: BACKUP_AGENT    — Same role, different model/provider
Level 3: DECOMPOSE        — Break task into smaller sub-tasks
Level 4: ESCALATE        — Human review queue
Level 5: SKIP            — Graceful degradation, continue with remaining tasks
```

## Testing

```bash
npm test
```

36 tests across 4 files:
- `tests/smoke.test.js` — core components (14 tests)
- `tests/orchestrator.test.js` — orchestrator lifecycle (6 tests)
- `tests/fallback.test.js` — fallback router + retry + escalation (11 tests)
- `tests/integration.test.js` — full pipeline with mock agents (5 tests)

## Environment

```bash
export GEMINI_API_KEY="your-key-here"
```

Without this key, agents will fail with `fetch failed` — the orchestrator handles this gracefully via the fallback chain.

## File Structure

```
orchestrator/
├── index.js                    # Entry point + CLI
├── orchestrator/orchestrator.js # Main orchestrator class
├── orchestrator/task-queue.js   # Priority queue + dependency graph
├── orchestrator/agent-pool.js   # Agent management + parallel execution
├── orchestrator/watchdog.js     # Health monitoring
├── orchestrator/fallback-router.js # 5-level fallback chain
├── agents/
│   ├── base-agent.js            # Abstract base class
│   ├── architect-agent.js       # System design agent
│   ├── coder-agent.js           # Code implementation agent
│   ├── reviewer-agent.js        # Code review agent
│   ├── tester-agent.js          # Test generation agent
│   └── docs-agent.js            # Documentation agent
├── shared/
│   ├── event-emitter.js         # Pub/sub event system
│   ├── message-bus.js           # Agent communication (8 message types)
│   └── context-store.js         # SQLite-backed shared context
├── fallback/
│   ├── retry-handler.js         # Exponential backoff
│   ├── task-decomposer.js       # LLM-powered task splitting
│   ├── escalation-queue.js      # Human escalation
│   └── backup-agent-factory.js  # Backup agent creation
├── output/
│   ├── project-assembler.js     # Build final project from outputs
│   ├── validator.js             # Validate completeness/quality
│   └── packager.js              # Package deliverable (tarball/zip)
├── config/
│   ├── agents.config.js         # Agent role definitions
│   ├── fallback.config.js       # Fallback thresholds
│   └── project.config.js        # Project structure config
├── lib/
│   └── llm-client.js            # Gemini REST API wrapper
└── tests/
    ├── smoke.test.js
    ├── orchestrator.test.js
    ├── fallback.test.js
    └── integration.test.js
```