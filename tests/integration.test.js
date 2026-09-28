import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { TaskQueue } from '../orchestrator/task-queue.js';
import { ContextStore } from '../shared/context-store.js';

// Mock agent that simulates task execution without API calls
class MockAgent {
  constructor(config, deps) {
    this.id = config.id;
    this.role = config.role;
    this.status = 'idle';
    this.currentTask = null;
    this.retryCount = 0;
    this.maxRetries = config.maxRetries || 3;
    this.lastHeartbeat = Date.now();
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.deps = deps;
    this._simulateDelay = config.simulateDelay || 50;
    this._shouldFail = config.shouldFail || false;
    this._failCount = config.failCount || 0;
    this._attemptCount = 0;
  }

  async execute(task) {
    this.status = 'working';
    this.currentTask = task;
    this._attemptCount++;

    // Simulate processing delay
    await new Promise(r => setTimeout(r, this._simulateDelay));

    if (this._shouldFail && this._attemptCount <= this._failCount) {
      this.failedTasks++;
      this.status = 'failed';
      this.currentTask = null;
      return { success: false, error: { message: `Mock failure attempt ${this._attemptCount}` } };
    }

    // Write to context store as a real agent would
    if (this.deps.contextStore) {
      this.deps.contextStore.set(`file:${task.id}`, `// Content for ${task.id}\nconsole.log("${task.title}");`);
    }

    this.completedTasks++;
    this.status = 'idle';
    this.currentTask = null;
    return { success: true, data: { result: `Completed: ${task.title}` } };
  }

  stop() { this.status = 'stopped'; }
  heartbeat() { this.lastHeartbeat = Date.now(); }
  getStats() {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask?.id,
      retryCount: this.retryCount,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
    };
  }
}

describe('Integration: Full Pipeline', () => {
  it('should execute independent tasks in parallel', async () => {
    const orch = new Orchestrator({
      maxConcurrent: 3,
    });

    // Register mock agent classes
    orch._agentClasses = {
      architect: MockAgent,
      coder: MockAgent,
      tester: MockAgent,
    };

    // Register agent configs
    orch.registerAgent('architect');
    orch.registerAgent('coder');
    orch.registerAgent('tester');

    // Initialize agents
    orch.initAgents(['architect', 'coder', 'tester']);
    expect(orch.agentPool.getAll().length).toBe(3);

    // Add independent tasks
    orch.addTasks([
      { id: 'T1', title: 'Task 1', agent: 'architect', depends_on: [], acceptance: ['Done'] },
      { id: 'T2', title: 'Task 2', agent: 'coder', depends_on: [], acceptance: ['Done'] },
      { id: 'T3', title: 'Task 3', agent: 'tester', depends_on: [], acceptance: ['Done'] },
    ]);

    // Run
    const result = await orch.run({ autoRetry: false });

    expect(result.completed).toBe(3);
    expect(result.failed).toBe(0);
    expect(orch.taskQueue.progress()).toBe(100);

    // Verify context was written
    const file1 = orch.contextStore.get('file:T1');
    expect(file1).toBeTruthy();
    expect(file1.value).toContain('Content for T1');

    orch.shutdown();
  });

  it('should respect task dependencies', async () => {
    const orch = new Orchestrator({ maxConcurrent: 2 });

    orch._agentClasses = { coder: MockAgent };
    orch.registerAgent('coder');
    orch.initAgents(['coder']);

    orch.addTasks([
      { id: 'T1', title: 'Setup', agent: 'coder', depends_on: [], acceptance: ['Done'] },
      { id: 'T2', title: 'Implement', agent: 'coder', depends_on: ['T1'], acceptance: ['Done'] },
      { id: 'T3', title: 'Test', agent: 'coder', depends_on: ['T2'], acceptance: ['Done'] },
    ]);

    const result = await orch.run({ autoRetry: false });

    expect(result.completed).toBe(3);
    expect(orch.taskQueue.completed.has('T1')).toBe(true);
    expect(orch.taskQueue.completed.has('T2')).toBe(true);
    expect(orch.taskQueue.completed.has('T3')).toBe(true);

    orch.shutdown();
  });

  it('should handle failing tasks and block dependents', async () => {
    const orch = new Orchestrator({ maxConcurrent: 2 });

    orch._agentClasses = { coder: MockAgent };
    orch.registerAgent('coder');
    orch.initAgents(['coder']);

    // Make the coder agent fail on T1
    const coderAgent = orch.agentPool.get('coder-1');
    coderAgent._shouldFail = true;
    coderAgent._failCount = 999; // Always fail

    orch.addTasks([
      { id: 'T1', title: 'Failing task', agent: 'coder', depends_on: [], acceptance: ['Done'] },
      { id: 'T2', title: 'Dependent task', agent: 'coder', depends_on: ['T1'], acceptance: ['Done'] },
    ]);

    const result = await orch.run({ autoRetry: false });

    expect(result.failed).toBe(2); // T1 failed, T2 blocked
    expect(orch.taskQueue.failed.has('T1')).toBe(true);
    expect(orch.taskQueue.failed.has('T2')).toBe(true);

    orch.shutdown();
  });

  it('should detect circular dependencies', () => {
    const queue = new TaskQueue();
    queue.add({ id: 'A', title: 'A', depends_on: ['B'] });
    queue.add({ id: 'B', title: 'B', depends_on: ['A'] });
    expect(queue.hasCircularDependency()).toBe(true);
  });

  it('should isolate context between runs', async () => {
    const orch1 = new Orchestrator();
    orch1._agentClasses = { coder: MockAgent };
    orch1.registerAgent('coder');
    orch1.initAgents(['coder']);
    orch1.addTasks([{ id: 'T1', title: 'Task 1', agent: 'coder', depends_on: [], acceptance: ['Done'] }]);
    await orch1.run({ autoRetry: false });

    // Verify context was written
    const file1 = orch1.contextStore.get('file:T1');
    expect(file1).toBeTruthy();

    // New orchestrator should have empty context
    const orch2 = new Orchestrator();
    const empty = orch2.contextStore.get('file:T1');
    expect(empty).toBeNull();

    orch1.shutdown();
    orch2.shutdown();
  });
});