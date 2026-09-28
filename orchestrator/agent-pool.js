/**
 * Agent Pool
 * Manages all agents: creation, lifecycle, parallel execution, and load balancing.
 */

import { BaseAgent, AGENT_STATUS } from '../agents/base-agent.js';
import { TaskQueue } from './task-queue.js';

export class AgentPool {
  constructor(deps = {}) {
    this.agents = new Map(); // id -> agent
    this.taskQueue = deps.taskQueue || new TaskQueue();
    this.messageBus = deps.messageBus;
    this.contextStore = deps.contextStore;
    this.eventEmitter = deps.eventEmitter;
    this.maxConcurrent = deps.maxConcurrent || 3;
    this.activeCount = 0;
    this.agentFactory = deps.agentFactory; // Function to create agent instances
  }

  /**
   * Register an agent instance.
   */
  register(agent) {
    this.agents.set(agent.id, agent);
  }

  /**
   * Create and register an agent from a config.
   */
  createAgent(config, deps = {}) {
    const agent = new BaseAgent(config, {
      llm: deps.llm,
      messageBus: this.messageBus,
      contextStore: this.contextStore,
      eventEmitter: this.eventEmitter,
      fileSystem: deps.fileSystem,
    });
    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Get an agent by ID.
   */
  get(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents.
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by role.
   */
  getByRole(role) {
    return this.getAll().filter(a => a.role === role);
  }

  /**
   * Get idle agents.
   */
  getIdleAgents() {
    return this.getAll().filter(a => a.status === AGENT_STATUS.IDLE);
  }

  /**
   * Get active (working) agents.
   */
  getActiveAgents() {
    return this.getAll().filter(a => a.status === AGENT_STATUS.WORKING || a.status === AGENT_STATUS.STUCK);
  }

  /**
   * Get a backup agent for a given role (different instance, same role).
   */
  getBackupAgent(role, excludeId) {
    const candidates = this.getByRole(role).filter(a => a.id !== excludeId && a.status === AGENT_STATUS.IDLE);
    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Execute a task on an available agent. Returns the agent used.
   */
  async executeTask(task, preferredAgentId = null) {
    // Find an agent
    let agent;
    if (preferredAgentId) {
      agent = this.agents.get(preferredAgentId);
      if (!agent || agent.status !== AGENT_STATUS.IDLE) {
        agent = this.getIdleAgents().find(a => a.role === this.agents.get(preferredAgentId)?.role) || null;
      }
    }

    if (!agent) {
      agent = this.getIdleAgents()[0];
    }

    if (!agent) {
      throw new Error('No idle agents available');
    }

    this.activeCount++;
    this.taskQueue.start(task.id);

    try {
      const result = await agent.execute(task);
      if (result.success) {
        this.taskQueue.complete(task.id, result.data);
      } else {
        this.taskQueue.fail(task.id, result.error);
      }
      return { agent, result };
    } finally {
      this.activeCount--;
    }
  }

  /**
   * Execute multiple tasks in parallel.
   * Respects maxConcurrent limit.
   */
  async executeParallel(tasks, agentRolePreference = {}) {
    const results = [];
    const queue = [...tasks];

    const workers = Math.min(this.maxConcurrent, queue.length, this.getIdleAgents().length || 1);

    const workerFn = async () => {
      while (queue.length > 0) {
        const task = queue.shift();
        const preferredAgentId = agentRolePreference[task.id] || task.agent;
        try {
          const result = await this.executeTask(task, preferredAgentId);
          results.push(result);
        } catch (err) {
          results.push({ task, error: err, agent: null, result: { success: false, error: err.message } });
        }
      }
    };

    const workersArray = [];
    for (let i = 0; i < workers; i++) {
      workersArray.push(workerFn());
    }
    await Promise.all(workersArray);

    return results;
  }

  /**
   * Stop all agents.
   */
  stopAll() {
    for (const agent of this.agents.values()) {
      agent.stop();
    }
  }

  /**
   * Get pool stats.
   */
  getStats() {
    const stats = {};
    for (const [id, agent] of this.agents) {
      stats[id] = agent.getStats();
    }
    return {
      totalAgents: this.agents.size,
      activeCount: this.activeCount,
      idleCount: this.getIdleAgents().length,
      agents: stats,
    };
  }
}

export default AgentPool;