/**
 * Base Agent Class
 * Abstract base for all agent types.
 * Handles: task execution, timeout, retry, heartbeat, context integration.
 */

import { LLMClient } from '../lib/llm-client.js';
import { MESSAGE_TYPES } from '../shared/message-bus.js';

export const AGENT_STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  STUCK: 'stuck',
  FAILED: 'failed',
  STOPPED: 'stopped',
};

export class BaseAgent {
  constructor(config, deps = {}) {
    this.id = config.id;
    this.role = config.role;
    this.model = config.model || 'gemini-2.0-flash';
    this.systemPrompt = config.systemPrompt || '';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
    this.status = AGENT_STATUS.IDLE;
    this.currentTask = null;
    this.retryCount = 0;
    this.lastHeartbeat = Date.now();
    this.startedAt = null;
    this.completedTasks = 0;
    this.failedTasks = 0;

    // Dependencies
    this.llm = deps.llm || new LLMClient({ model: this.model });
    this.messageBus = deps.messageBus;
    this.contextStore = deps.contextStore;
    this.eventEmitter = deps.eventEmitter;
    this.fileSystem = deps.fileSystem; // Optional: fs wrapper

    this._setupHeartbeat();
  }

  /**
   * Execute a task. Returns { success, data, error }.
   */
  async execute(task) {
    this.status = AGENT_STATUS.WORKING;
    this.currentTask = task;
    this.retryCount = 0;
    this.startedAt = Date.now();

    // Emit started event
    this.eventEmitter?.emit('agent:started', { agentId: this.id, task });

    // Notify via message bus
    this.messageBus?.send(this.id, '*', MESSAGE_TYPES.TASK_ASSIGN, {
      taskId: task.id,
      taskTitle: task.title,
    });

    try {
      const result = await this._executeWithTimeout(task);

      if (result.success) {
        this.completedTasks++;
        this.status = AGENT_STATUS.IDLE;
        this.eventEmitter?.emit('task:completed', {
          agentId: this.id,
          taskId: task.id,
          data: result.data,
        });
        this.messageBus?.send(this.id, '*', MESSAGE_TYPES.TASK_COMPLETE, {
          taskId: task.id,
          data: result.data,
        });
      } else {
        this.failedTasks++;
        this.status = AGENT_STATUS.FAILED;
        this.eventEmitter?.emit('task:failed', {
          agentId: this.id,
          taskId: task.id,
          error: result.error,
        });
        this.messageBus?.send(this.id, '*', MESSAGE_TYPES.TASK_FAILED, {
          taskId: task.id,
          error: result.error,
        });
      }

      return result;
    } catch (err) {
      this.failedTasks++;
      this.status = AGENT_STATUS.FAILED;
      const error = { message: err.message, stack: err.stack };
      this.eventEmitter?.emit('task:failed', { agentId: this.id, taskId: task.id, error });
      this.messageBus?.send(this.id, '*', MESSAGE_TYPES.TASK_FAILED, {
        taskId: task.id,
        error,
      });
      return { success: false, error };
    } finally {
      this.currentTask = null;
      this.startedAt = null;
    }
  }

  /**
   * Execute with timeout watchdog.
   */
  async _executeWithTimeout(task) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.status = AGENT_STATUS.STUCK;
        this.eventEmitter?.emit('agent:stuck', {
          agentId: this.id,
          taskId: task.id,
          timeout: this.timeout,
        });
        reject(new Error(`Agent ${this.id} timed out after ${this.timeout}ms`));
      }, this.timeout);

      this.performTask(task)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  /**
   * Override in subclasses. Must return { success, data/error }.
   */
  async performTask(task) {
    throw new Error('BaseAgent.performTask must be overridden');
  }

  /**
   * Generate text via LLM with agent context.
   */
  async generate(prompt, options = {}) {
    const fullPrompt = this.systemPrompt ? `${this.systemPrompt}\n\n${prompt}` : prompt;
    return this.llm.generate(fullPrompt, options);
  }

  /**
   * Generate and validate JSON via LLM.
   */
  async generateJSON(prompt, schema, options = {}) {
    const fullPrompt = this.systemPrompt ? `${this.systemPrompt}\n\n${prompt}` : prompt;
    return this.llm.generateJSON(fullPrompt, schema, options);
  }

  /**
   * Read from shared context.
   */
  getContext(key) {
    return this.contextStore?.get(key);
  }

  /**
   * Write to shared context.
   */
  setContext(key, value, type = 'json') {
    return this.contextStore?.set(key, value, this.id, type);
  }

  /**
   * Acquire a file lock before editing.
   */
  async acquireLock(fileKey) {
    if (!this.contextStore) return true;
    let attempts = 0;
    while (attempts < 10) {
      if (this.contextStore.acquireLock(fileKey, this.id)) {
        return true;
      }
      await this._sleep(500);
      attempts++;
    }
    throw new Error(`Could not acquire lock for ${fileKey} after 10 attempts`);
  }

  /**
   * Release a file lock.
   */
  releaseLock(fileKey) {
    this.contextStore?.releaseLock(fileKey, this.id);
  }

  /**
   * Send a message to another agent.
   */
  send(toAgent, messageType, payload) {
    this.messageBus?.send(this.id, toAgent, messageType, payload);
  }

  /**
   * Heartbeat: update lastHeartbeat and send HEARTBEAT message.
   */
  heartbeat() {
    this.lastHeartbeat = Date.now();
    this.messageBus?.send(this.id, '*', MESSAGE_TYPES.HEARTBEAT, {
      status: this.status,
      task: this.currentTask?.id,
    });
  }

  /**
   * Start periodic heartbeat.
   */
  _setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 5000);
  }

  /**
   * Stop heartbeat.
   */
  stop() {
    this.status = AGENT_STATUS.STOPPED;
    clearInterval(this.heartbeatInterval);
    this.eventEmitter?.emit('agent:stopped', { agentId: this.id });
  }

  /**
   * Get agent stats.
   */
  getStats() {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask?.id,
      retryCount: this.retryCount,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BaseAgent;