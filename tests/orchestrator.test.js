import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { TaskQueue } from '../orchestrator/task-queue.js';
import { EventEmitter } from '../shared/event-emitter.js';
import { ContextStore } from '../shared/context-store.js';

describe('Orchestrator', () => {
  it('should initialize with default components', () => {
    const orch = new Orchestrator();
    expect(orch.taskQueue).toBeInstanceOf(TaskQueue);
    expect(orch.eventEmitter).toBeInstanceOf(EventEmitter);
    expect(orch.contextStore).toBeInstanceOf(ContextStore);
    expect(orch.watchdog).toBeTruthy();
    expect(orch.fallbackRouter).toBeTruthy();
  });

  it('should register and initialize agents', () => {
    const orch = new Orchestrator();
    orch.registerAgent('architect');
    expect(orch._registeredAgents.has('architect')).toBe(true);

    // Mock agent class
    orch._agentClasses = {
      architect: class TestAgent {
        constructor(config, deps) {
          this.id = config.id;
          this.role = config.role;
          this.status = 'idle';
          this.currentTask = null;
          this.retryCount = 0;
          this.lastHeartbeat = Date.now();
          this.completedTasks = 0;
          this.failedTasks = 0;
        }
        async execute() { return { success: true, data: {} }; }
        stop() {}
        getStats() {
          return { id: this.id, role: this.role, status: this.status, completedTasks: this.completedTasks, failedTasks: this.failedTasks };
        }
      },
    };

    const agents = orch.initAgents(['architect']);
    expect(agents.length).toBe(1);
    expect(agents[0].role).toBe('architect');
  });

  it('should add tasks to the queue', () => {
    const orch = new Orchestrator();
    orch.addTasks([
      { id: 'T1', title: 'Task 1', depends_on: [] },
      { id: 'T2', title: 'Task 2', depends_on: ['T1'] },
    ]);
    expect(orch.taskQueue.tasks.size).toBe(2);
  });

  it('should track progress', () => {
    const orch = new Orchestrator();
    orch.addTasks([
      { id: 'T1', title: 'Task 1', depends_on: [] },
    ]);
    expect(orch.taskQueue.progress()).toBe(0);

    orch.taskQueue.start('T1');
    orch.taskQueue.complete('T1', null);
    expect(orch.taskQueue.progress()).toBe(100);
  });

  it('should shutdown gracefully', () => {
    const orch = new Orchestrator();
    expect(() => orch.shutdown()).not.toThrow();
  });

  it('should provide status', () => {
    const orch = new Orchestrator();
    const status = orch.getStatus();
    expect(status.taskQueue).toBeTruthy();
    expect(status.agentPool).toBeTruthy();
    expect(status.watchdog).toBeTruthy();
  });
});