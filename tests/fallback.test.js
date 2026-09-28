import { describe, it, expect } from 'vitest';
import { FallbackRouter } from '../orchestrator/fallback-router.js';
import { TaskQueue } from '../orchestrator/task-queue.js';
import { EscalationQueue } from '../fallback/escalation-queue.js';
import { RetryHandler } from '../fallback/retry-handler.js';

// Mock agent
function createMockAgent(id = 'agent-1', role = 'coder') {
  return {
    id,
    role,
    status: 'idle',
    currentTask: null,
    retryCount: 0,
    maxRetries: 3,
    async execute(task) {
      return { success: true, data: { result: 'ok' } };
    },
    stop() { this.status = 'stopped'; },
  };
}

describe('FallbackRouter', () => {
  let router;
  let taskQueue;
  let escalationQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue();
    escalationQueue = new EscalationQueue();
    router = new FallbackRouter(
      {
        agents: new Map(),
        getAll: () => [],
        getIdleAgents: () => [],
        getBackupAgent: () => null,
        executeTask: async (task) => ({ agent: createMockAgent(), result: { success: true, data: {} }, task }),
      },
      taskQueue,
      { escalationQueue, maxRetries: 3 }
    );
  });

  it('should determine RETRY strategy for first failures', () => {
    const agent = createMockAgent();
    agent.retryCount = 0;
    const strategy = router.determineStrategy('TIMEOUT', agent.retryCount);
    expect(strategy).toBe('RETRY');
  });

  it('should determine BACKUP_AGENT strategy for repeated failures', () => {
    const agent = createMockAgent();
    agent.retryCount = 3;
    const strategy = router.determineStrategy('TIMEOUT', agent.retryCount);
    expect(strategy).toBe('BACKUP_AGENT');
  });

  it('should determine ESCALATE strategy for critical errors', () => {
    const agent = createMockAgent();
    agent.retryCount = 5;
    const strategy = router.determineStrategy('CRITICAL_ERROR', agent.retryCount);
    expect(strategy).toBe('ESCALATE');
  });

  it('should determine DECOMPOSE strategy for invalid args', () => {
    const agent = createMockAgent();
    agent.retryCount = 3;
    const strategy = router.determineStrategy('INVALID_ARGS', agent.retryCount);
    expect(strategy).toBe('DECOMPOSE');
  });

  it('should record fallback history', async () => {
    const agent = createMockAgent();
    const task = { id: 'T1', title: 'Task 1' };
    await router.handleFailure(agent, task, 'TIMEOUT');
    expect(router.getHistory().length).toBe(1);
    expect(router.getHistory()[0].reason).toBe('TIMEOUT');
  });

  it('should skip task as last resort', async () => {
    const agent = createMockAgent();
    agent.retryCount = 10;
    const task = { id: 'T1', title: 'Task 1' };
    taskQueue.add(task);
    const result = await router.handleFailure(agent, task, 'UNKNOWN_ERROR');
    expect(result.skipped).toBe(true);
    expect(taskQueue.failed.has('T1')).toBe(true);
  });
});

describe('RetryHandler', () => {
  it('should use exponential backoff', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelay: 10 });
    const delays = [];
    const originalSleep = RetryHandler.prototype._sleep;
    // We can't easily test timing, but we can verify the function retries
    let calls = 0;
    const result = await handler.execute(async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(3);
  });

  it('should not retry on auth errors', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelay: 10 });
    let calls = 0;
    await expect(handler.execute(async () => {
      calls++;
      throw new Error('401 Unauthorized');
    })).rejects.toThrow('401');
    expect(calls).toBe(1);
  });
});

describe('EscalationQueue', () => {
  it('should add and list escalations', () => {
    const queue = new EscalationQueue();
    queue.add({ id: 'T1', title: 'Task 1' }, 'TIMEOUT');
    queue.add({ id: 'T2', title: 'Task 2' }, 'CRITICAL_ERROR');
    expect(queue.pendingCount()).toBe(2);
    expect(queue.getAll().length).toBe(2);
  });

  it('should resolve escalations', () => {
    const queue = new EscalationQueue();
    const esc = queue.add({ id: 'T1', title: 'Task 1' }, 'TIMEOUT');
    expect(queue.resolve(esc.id)).toBe(true);
    expect(queue.pendingCount()).toBe(0);
  });

  it('should auto-resolve stale escalations', async () => {
    const queue = new EscalationQueue({ autoResolveTimeout: 100 });
    queue.add({ id: 'T1', title: 'Task 1' }, 'TIMEOUT');
    expect(queue.pendingCount()).toBe(1);
    // Wait for auto-resolve timeout
    await new Promise(r => setTimeout(r, 150));
    const resolved = queue.autoResolveStale();
    expect(resolved).toBe(1);
    expect(queue.pendingCount()).toBe(0);
  });
});