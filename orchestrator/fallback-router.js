/**
 * Fallback Router
 * 5-level fallback chain for agent failures.
 * Level 1: Retry with backoff
 * Level 2: Backup agent (same role, different model)
 * Level 3: Task decomposition (break into sub-tasks)
 * Level 4: Human escalation
 * Level 5: Graceful degradation (skip)
 */

import { AGENT_STATUS } from '../agents/base-agent.js';

export const FALLBACK_STRATEGIES = {
  RETRY: 'RETRY',
  BACKUP_AGENT: 'BACKUP_AGENT',
  DECOMPOSE: 'DECOMPOSE',
  ESCALATE: 'ESCALATE',
  SKIP: 'SKIP',
};

export class FallbackRouter {
  constructor(agentPool, taskQueue, config = {}) {
    this.agentPool = agentPool;
    this.taskQueue = taskQueue;
    this.maxRetries = config.maxRetries || 3;
    this.escalationQueue = config.escalationQueue || [];
    this.fallbackHistory = [];
    this.decomposer = config.decomposer;
  }

  /**
   * Handle a failure. Determines strategy and executes it.
   */
  async handleFailure(agent, task, reason) {
    const strategy = this.determineStrategy(reason, agent.retryCount);

    const record = {
      agentId: agent.id,
      taskId: task.id,
      reason,
      strategy,
      timestamp: Date.now(),
    };
    this.fallbackHistory.push(record);

    console.log(`[Fallback] ${agent.id} failed (${reason}). Strategy: ${strategy}`);

    switch (strategy) {
      case FALLBACK_STRATEGIES.RETRY:
        return this.retryTask(task, agent);
      case FALLBACK_STRATEGIES.BACKUP_AGENT:
        return this.assignToBackup(task, agent.role);
      case FALLBACK_STRATEGIES.DECOMPOSE:
        return this.decomposeAndAssign(task);
      case FALLBACK_STRATEGIES.ESCALATE:
        return this.escalateToHuman(task, reason);
      case FALLBACK_STRATEGIES.SKIP:
        return this.skipTask(task, reason);
      default:
        return this.skipTask(task, reason);
    }
  }

  /**
   * Determine which fallback strategy to use.
   */
  determineStrategy(reason, retryCount) {
    // Invalid arguments: decompose the task (break into smaller pieces)
    if (reason === 'INVALID_ARGS' || reason === 'BAD_OUTPUT') {
      return FALLBACK_STRATEGIES.DECOMPOSE;
    }

    // Critical errors: escalate immediately
    if (reason === 'CRITICAL_ERROR' || reason === 'REPEATED_STUCK') {
      return FALLBACK_STRATEGIES.ESCALATE;
    }

    // Very high retry count with unknown reason: skip to avoid infinite loops
    if (retryCount >= this.maxRetries * 3) {
      return FALLBACK_STRATEGIES.SKIP;
    }

    // If we've already retried too many times, try backup agent
    if (retryCount >= this.maxRetries) {
      return FALLBACK_STRATEGIES.BACKUP_AGENT;
    }

    // Stuck or timeout: try backup agent after a few retries
    if (reason === 'STUCK' || reason === 'TIMEOUT' || reason === 'NO_HEARTBEAT' || reason === 'TASK_TIMEOUT') {
      if (retryCount >= 2) {
        return FALLBACK_STRATEGIES.BACKUP_AGENT;
      }
    }

    // First failures: retry
    return FALLBACK_STRATEGIES.RETRY;
  }

  /**
   * Level 1: Retry the task on the same agent.
   */
  async retryTask(task, agent) {
    agent.retryCount++;
    const backoff = Math.pow(2, agent.retryCount) * 1000;
    await this._sleep(backoff);
    agent.status = 'idle';
    return this.agentPool.executeTask(task, agent.id);
  }

  /**
   * Level 2: Assign to a backup agent of the same role.
   */
  async assignToBackup(task, role) {
    const backup = this.agentPool.getBackupAgent(role, task.agent);
    if (backup) {
      task.simplified = true;
      return this.agentPool.executeTask(task, backup.id);
    }
    // No backup available, try any idle agent
    const idle = this.agentPool.getIdleAgents()[0];
    if (idle) {
      return this.agentPool.executeTask(task, idle.id);
    }
    // No agents available, escalate
    return this.escalateToHuman(task, 'NO_BACKUP_AVAILABLE');
  }

  /**
   * Level 3: Decompose the task into sub-tasks.
   */
  async decomposeAndAssign(task) {
    if (this.decomposer) {
      const subTasks = await this.decomposer.decompose(task);
      const results = [];
      for (const subTask of subTasks) {
        try {
          const result = await this.agentPool.executeTask(subTask);
          results.push(result);
        } catch (err) {
          results.push({ task: subTask, error: err, result: { success: false, error: err.message } });
        }
      }
      return results;
    }
    // No decomposer available, escalate
    return this.escalateToHuman(task, 'NO_DECOMPOSER');
  }

  /**
   * Level 4: Escalate to human review.
   */
  escalateToHuman(task, reason) {
    const escalation = {
      taskId: task.id,
      taskTitle: task.title,
      reason,
      timestamp: Date.now(),
      status: 'pending',
      resolvedAt: null,
    };

    if (this.escalationQueue && typeof this.escalationQueue.add === 'function') {
      this.escalationQueue.add(escalation);
    } else if (Array.isArray(this.escalationQueue)) {
      this.escalationQueue.push(escalation);
    }

    console.log(`[Escalation] Task ${task.id} added to human review queue. Reason: ${reason}`);
    return { escalated: true, escalation };
  }

  /**
   * Level 5: Skip the task gracefully.
   */
  skipTask(task, reason) {
    this.taskQueue.block(task.id);
    console.log(`[Skip] Task ${task.id} skipped. Reason: ${reason}`);
    return { skipped: true, task, reason };
  }

  /**
   * Get fallback history.
   */
  getHistory() {
    return [...this.fallbackHistory];
  }

  /**
   * Get pending escalations.
   */
  getEscalations() {
    return [...this.escalationQueue];
  }

  /**
   * Resolve an escalation.
   */
  resolveEscalation(taskId) {
    const idx = this.escalationQueue.findIndex(e => e.taskId === taskId);
    if (idx > -1) {
      this.escalationQueue[idx].status = 'resolved';
      this.escalationQueue[idx].resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default FallbackRouter;