# Agentic Studio — Rebuild Architecture

## Decision: Option A — Agents call LLM APIs directly (programmatic)

Each agent is a Node.js class that calls a REST LLM API, validates the
response, writes files, and updates a shared context store. Full programmatic
control over timeouts, retries, context sharing, and fallback routing.

## LLM Provider Strategy

Primary: Gemini REST API (free tier, already configured in scripts)
Fallback: Kilo Code free auto-model via Agent Manager
Retry: exponential backoff with multiple keys when available

## Core Components

1. Context Sharing Window — SQLite-backed shared state
2. Agent Communication Protocol — message bus with 8 message types
3. Supervisor / Watchdog — health monitor every 5s
4. Fallback & Recovery System — 5-level fallback chain
5. Output Assembler — builds final project from agent outputs

## Project Structure

your-project/
├── src/
│   ├── orchestrator/
│   │   ├── agent-pool.js
│   │   ├── task-queue.js
│   │   ├── context-manager.js
│   │   ├── watchdog.js
│   │   └── fallback-router.js
│   ├── agents/
│   │   ├── base-agent.js
│   │   ├── architect-agent.js
│   │   ├── coder-agent.js
│   │   ├── reviewer-agent.js
│   │   ├── tester-agent.js
│   │   └── docs-agent.js
│   ├── shared/
│   │   ├── context-store.js
│   │   ├── message-bus.js
│   │   └── event-emitter.js
│   ├── fallback/
│   │   ├── retry-handler.js
│   │   ├── backup-agent-factory.js
│   │   ├── task-decomposer.js
│   │   └── escalation-queue.js
│   └── output/
│       ├── project-assembler.js
│       ├── validator.js
│       └── packager.js
├── config/
│   ├── agents.config.js
│   ├── fallback.config.js
│   └── project.config.js
└── tests/
    ├── orchestrator.test.js
    ├── fallback.test.js
    └── integration.test.js

## Build Order

Week 1: Foundation
  Day 1-2: Base agent class + message bus
  Day 3-4: Context store + task queue
  Day 5:   Simple 2-agent communication

Week 2: Agent Pool
  Day 1-2: All 5 agents (architect, coder, reviewer, tester, docs)
  Day 3-4: Parallel execution engine
  Day 5:   Context sharing between agents

Week 3: Bulletproofing
  Day 1-2: Watchdog + health monitoring
  Day 3-4: Fallback router (all 5 levels)
  Day 5:   Edge case handling

Week 4: Output & Polish
  Day 1-2: Project assembler + validator
  Day 3-4: Testing + bug fixes
  Day 5:   Documentation + deployment

## Edge Cases Handled

- Two agents edit same file simultaneously → distributed lock per file
- Context window overflows → auto-compress old context, keep summaries
- Agent produces invalid code → reviewer agent validates before commit
- Task depends on failed task → dependency graph, pause dependents
- All agents busy → priority queue, task scheduling
- Circular task dependencies → topological sort, detect cycles
- API rate limits → request queue, backoff, multiple keys
- Partial project completion → checkpoint system, resume from last good state
- Conflicting agent outputs → voting mechanism, senior agent decides
- Memory leak from long runs → periodic agent restart, stateless design
- Chat getting stuck mid-conversation → timeout + context snapshot + resume
- Invalid JSON from LLM → schema validation + auto-repair prompt