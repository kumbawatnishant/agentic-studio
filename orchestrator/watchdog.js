/**
 * Watchdog / Supervisor
 * Monitors all agents every 5 seconds.
 * Detects stuck agents, timeouts, and health issues.
 * Triggers fallback routing when problems are detected.
 */

import { AGENT_STATUS } from '../agents/base-agent.js';

export class Watchdog {
  constructor(agentPool, fallbackRouter, config = {}) {
    this.agentPool = agentPool;
    this.fallbackRouter = fallbackRouter;
    this.checkInterval = config.checkInterval || 5000; // 5 seconds
    this.stuckThreshold = config.stuckThreshold || 60000; // 60 seconds
    this.maxRetries = config.maxRetries || 3;
    this.intervalId = null;
    this.stuckHistory = new Map(); // agentId -> count of times stuck
  }

  /**
   * Start monitoring.
   */
  start() {
    this.intervalId = setInterval(() => this.checkAllAgents(), this.checkInterval);
  }

  /**
   * Stop monitoring.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check all agents for health issues.
   */
  async checkAllAgents() {
    const agents = this.agentPool.getActiveAgents();
    const now = Date.now();

    for (const agent of agents) {
      // Check 1: Stuck status
      if (agent.status === AGENT_STATUS.STUCK) {
        await this.handleStuckAgent(agent, 'STUCK_STATUS');
        continue;
      }

      // Check 2: No heartbeat for too long
      const timeSinceHeartbeat = now - agent.lastHeartbeat;
      if (timeSinceHeartbeat > this.stuckThreshold) {
        await this.handleStuckAgent(agent, 'NO_HEARTBEAT', { timeSinceHeartbeat });
        continue;
      }

      // Check 3: Working on same task for too long
      if (agent.status === AGENT_STATUS.WORKING && agent.startedAt) {
        const taskDuration = now - agent.startedAt;
        if (taskDuration > this.stuckThreshold) {
          await this.handleStuckAgent(agent, 'TASK_TIMEOUT', { taskDuration });
          continue;
        }
      }

      // Check 4: Excessive retries on same task
      if (agent.retryCount >= this.maxRetries && agent.status === AGENT_STATUS.WORKING) {
        await this.handleStuckAgent(agent, 'MAX_RETRIES_EXCEEDED', { retryCount: agent.retryCount });
      }
    }
  }

  /**
   * Handle a stuck agent.
   */
  async handleStuckAgent(agent, reason, details = {}) {
    const agentId = agent.id;
    const taskId = agent.currentTask?.id;

    // Track stuck history
    const count = (this.stuckHistory.get(agentId) || 0) + 1;
    this.stuckHistory.set(agentId, count);

    console.log(`[Watchdog] Agent ${agentId} is stuck (${reason}). Details:`, details);

    // If stuck too many times, escalate
    if (count >= 3) {
      console.log(`[Watchdog] Agent ${agentId} stuck ${count} times. Escalating.`);
      if (this.fallbackRouter) {
        await this.fallbackRouter.handleFailure(agent, agent.currentTask, 'REPEATED_STUCK');
      }
      return;
    }

    // Try to kill the agent
    try {
      agent.stop();
    } catch (err) {
      console.error(`[Watchdog] Error stopping agent ${agentId}:`, err.message);
    }

    // Route to fallback
    if (this.fallbackRouter && agent.currentTask) {
      await this.fallbackRouter.handleFailure(agent, agent.currentTask, reason);
    }
  }

  /**
   * Get watchdog stats.
   */
  getStats() {
    return {
      checkInterval: this.checkInterval,
      stuckThreshold: this.stuckThreshold,
      stuckHistory: Object.fromEntries(this.stuckHistory),
      isRunning: !!this.intervalId,
    };
  }
}

export default Watchdog;