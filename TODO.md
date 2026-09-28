# TODO — Agentic Studio (Rebuild)

## Status Legend
- [x] Completed
- [ ] Pending

---

## Phase 1: Foundation (Week 1) — DONE
- [x] Create directory structure under `agentic-studio/`
- [x] Build `shared/event-emitter.js` — event system
- [x] Build `shared/message-bus.js` — agent communication (8 message types)
- [x] Build `shared/context-store.js` — SQLite-backed shared state with locks
- [x] Build `agents/base-agent.js` — abstract class with timeout/retry/heartbeat
- [x] Wire up LLM client (`lib/llm-client.js`) — Gemini REST with JSON validation
- [x] Test: 14/14 smoke tests pass

## Phase 2: Agent Pool (Week 2) — DONE
- [x] Build `orchestrator/task-queue.js` — dependency graph + circular detection
- [x] Build `orchestrator/agent-pool.js` — parallel execution, load balancing
- [x] Build `agents/architect-agent.js` — system design, schemas, API contracts
- [x] Build `agents/coder-agent.js` — feature implementation with tests
- [x] Build `agents/reviewer-agent.js` — code review, security audit
- [x] Build `agents/tester-agent.js` — test generation, bug reporting
- [x] Build `agents/docs-agent.js` — README, API docs, setup guides
- [x] Build `config/agents.config.js` — all 5 agent role definitions
- [x] Build `index.js` — entry point, orchestrator factory, CLI
- [x] Verified: `node index.js run sample-project.json` dispatches 4 tasks to 5 agents

## Phase 3: Bulletproofing (Week 3) — DONE
- [x] Build `orchestrator/watchdog.js` — 5s health checks, stuck detection
- [x] Build `fallback/retry-handler.js` — exponential backoff with jitter
- [x] Build `fallback/backup-agent-factory.js` — backup agent creation
- [x] Build `fallback/task-decomposer.js` — LLM-powered task splitting
- [x] Build `fallback/escalation-queue.js` — human escalation with auto-resolve
- [x] Build `orchestrator/fallback-router.js` — 5-level fallback chain
- [x] Build `config/fallback.config.js` — all thresholds and limits
- [x] Verified: failures trigger fallback chain (tested with missing API key)

## Phase 4: Output & Polish (Week 4) — DONE
- [x] Wire `output/project-assembler.js` into orchestrator run loop
- [x] Wire `output/validator.js` into run loop
- [x] Wire `output/packager.js` into run loop
- [x] Write `tests/orchestrator.test.js` — 6 tests
- [x] Write `tests/fallback.test.js` — 11 tests
- [x] Write `tests/integration.test.js` — 5 tests (full pipeline)
- [x] Add `ORCHESTRATOR.md` — complete orchestrator documentation
- [x] Updated `README.md` — documents both programmatic and manual modes
- [x] All 36 tests passing

## Live Execution
- [ ] Set `GEMINI_API_KEY` environment variable for real agent execution
- [ ] Test with a real project (e.g., `ludo-game/tasks.json`)