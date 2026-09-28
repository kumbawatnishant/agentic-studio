/**
 * Orchestrator
 * Main entry point that ties together all components.
 * Manages the full lifecycle: task queue -> agent pool -> watchdog -> fallback -> output.
 */

import { TaskQueue } from './task-queue.js';
import { AgentPool } from './agent-pool.js';
import { Watchdog } from './watchdog.js';
import { FallbackRouter } from './fallback-router.js';
import { EscalationQueue } from '../fallback/escalation-queue.js';
import { TaskDecomposer } from '../fallback/task-decomposer.js';
import { RetryHandler } from '../fallback/retry-handler.js';
import { ContextStore } from '../shared/context-store.js';
import { MessageBus } from '../shared/message-bus.js';
import { EventEmitter } from '../shared/event-emitter.js';
import { LLMClient } from '../lib/llm-client.js';
import AGENT_CONFIGS from '../config/agents.config.js';

export class Orchestrator {
  constructor(config = {}) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.messageBus = new MessageBus();
    this.contextStore = new ContextStore(config.dbPath || ':memory:');
    this.llm = new LLMClient({
      model: config.model || 'gemini-3.6-flash',
      apiKey: config.apiKey || process.env.GEMINI_API_KEY,
    });
    this.taskQueue = new TaskQueue();
    this.escalationQueue = new EscalationQueue(config.escalation || {});
    this.retryHandler = new RetryHandler(config.retry || {});
    this.decomposer = new TaskDecomposer(this.llm);
    this.agentPool = new AgentPool({
      taskQueue: this.taskQueue,
      messageBus: this.messageBus,
      contextStore: this.contextStore,
      eventEmitter: this.eventEmitter,
      maxConcurrent: config.maxConcurrent || 3,
    });
    this.fallbackRouter = new FallbackRouter(
      this.agentPool,
      this.taskQueue,
      {
        escalationQueue: this.escalationQueue,
        decomposer: this.decomposer,
        ...config.fallback,
      }
    );
    this.watchdog = new Watchdog(
      this.agentPool,
      this.fallbackRouter,
      config.watchdog || {}
    );
    // Output components
    this.assembler = config.assembler || null;
    this.validator = config.validator || null;
    this.packager = config.packager || null;
    this._setupEventHandlers();
    this._registeredAgents = new Map();
    this._agentClasses = config.agentClasses || {};
  }

  /**
   * Register an agent configuration.
   */
  registerAgent(role, agentConfig = null) {
    const config = agentConfig || AGENT_CONFIGS[role];
    if (!config) {
      throw new Error(`Unknown agent role: ${role}`);
    }
    this._registeredAgents.set(role, config);
  }

  /**
   * Register all default agents.
   */
  registerDefaultAgents() {
    for (const [role, config] of Object.entries(AGENT_CONFIGS)) {
      this.registerAgent(role, config);
    }
  }

  /**
   * Initialize agents (create instances and register in pool).
   */
  initAgents(roles = null) {
    const rolesToInit = roles || Array.from(this._registeredAgents.keys());
    for (const role of rolesToInit) {
      const config = this._registeredAgents.get(role);
      if (!config) continue;

      const AgentClass = this._getAgentClass(role);
      if (!AgentClass) {
        console.warn(`[Orchestrator] No agent class registered for role: ${role}`);
        continue;
      }

      const agent = new AgentClass(config, {
        llm: this.llm,
        messageBus: this.messageBus,
        contextStore: this.contextStore,
        eventEmitter: this.eventEmitter,
      });
      this.agentPool.register(agent);
    }
    return this.agentPool.getAll();
  }

  /**
   * Get the agent class for a role. Override in subclasses for custom agents.
   */
  _getAgentClass(role) {
    const agentClasses = {
      architect: this._agentClasses?.architect,
      coder: this._agentClasses?.coder,
      optimizer: this._agentClasses?.optimizer,
      reviewer: this._agentClasses?.reviewer,
      tester: this._agentClasses?.tester,
      docs: this._agentClasses?.docs,
      deployer: this._agentClasses?.deployer,
      'project-manager': this._agentClasses?.['project-manager'],
    };
    return agentClasses?.[role] || this._agentClasses?.base || null;
  }

  /**
   * Add tasks to the queue.
   */
  addTasks(tasks) {
    this.taskQueue.addAll(tasks);
  }

  /**
   * Run the full orchestration loop.
   * Executes all ready tasks, respecting dependencies and concurrency limits.
   */
  async run(config = {}) {
    const maxConcurrent = config.maxConcurrent || this.agentPool.maxConcurrent || 3;
    const autoRetry = config.autoRetry !== false;

    // Start watchdog
    this.watchdog.start();

    console.log(`[Orchestrator] Starting with ${maxConcurrent} concurrent agents`);

    let loopCount = 0;
    const maxLoops = config.maxLoops || 1000;

    while (this.taskQueue.remaining() > 0 && loopCount < maxLoops) {
      loopCount++;

      // Get ready tasks
      const readyTasks = this.taskQueue.getReady(maxConcurrent);

      if (readyTasks.length === 0) {
        // No ready tasks — check if we're stuck
        const pending = this.taskQueue.getByStatus('todo');
        if (pending.length === 0) break;

        // Wait a bit before retrying
        await this._sleep(2000);
        continue;
      }

      // Execute tasks in parallel
      const results = await this.agentPool.executeParallel(readyTasks);

      // Check for failures and trigger fallback
      for (const result of results) {
        if (!result.result.success && autoRetry) {
          const agent = result.agent;
          const task = result.task;
          if (agent && task) {
            await this.fallbackRouter.handleFailure(agent, task, result.result.error?.message || 'UNKNOWN');
          }
        }
      }

      // Auto-resolve stale escalations
      this.escalationQueue.autoResolveStale();
    }

    // Stop watchdog
    this.watchdog.stop();

    // Check if all tasks completed
    const remaining = this.taskQueue.remaining();
    const progress = this.taskQueue.progress();

    console.log(`[Orchestrator] Run complete. Progress: ${progress}%, Remaining: ${remaining}`);

    // Assemble output if configured
    let assembly = null;
    if (this.assembler) {
      try {
        console.log('[Orchestrator] Assembling output...');
        assembly = await this.assembler.assemble({
          name: this.config.projectName || 'project',
          description: this.config.projectDescription || '',
          techStack: this.config.techStack || [],
        });
      } catch (err) {
        console.error('[Orchestrator] Assembly failed:', err.message);
      }
    }

    return {
      progress,
      remaining,
      completed: this.taskQueue.completed.size,
      failed: this.taskQueue.failed.size,
      escalations: this.escalationQueue.getPending().length,
      assembly,
    };
  }

  /**
   * Setup event handlers for system events.
   */
  _setupEventHandlers() {
    this.eventEmitter.on('agent:stuck', (data) => {
      console.log(`[Event] Agent ${data.agentId} stuck on task ${data.taskId}`);
    });

    this.eventEmitter.on('task:failed', (data) => {
      console.log(`[Event] Task ${data.taskId} failed: ${data.error?.message || 'unknown'}`);
    });

    this.eventEmitter.on('fallback:triggered', (data) => {
      console.log(`[Event] Fallback triggered for task ${data.taskId}`);
    });
  }

  /**
   * Get full system status.
   */
  getStatus() {
    return {
      taskQueue: {
        total: this.taskQueue.tasks.size,
        completed: this.taskQueue.completed.size,
        failed: this.taskQueue.failed.size,
        progress: this.taskQueue.progress(),
      },
      agentPool: this.agentPool.getStats(),
      watchdog: this.watchdog.getStats(),
      escalations: this.escalationQueue.getPending().length,
      fallbackHistory: this.fallbackRouter.getHistory().length,
    };
  }

  /**
   * Shutdown gracefully.
   */
  shutdown() {
    this.watchdog.stop();
    this.agentPool.stopAll();
    this.contextStore.close();
    console.log('[Orchestrator] Shutdown complete');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default Orchestrator;