import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../shared/event-emitter.js';
import { MessageBus } from '../shared/message-bus.js';
import { ContextStore } from '../shared/context-store.js';
import { TaskQueue } from '../orchestrator/task-queue.js';
import { RetryHandler } from '../fallback/retry-handler.js';
import { EscalationQueue } from '../fallback/escalation-queue.js';

describe('EventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new EventEmitter();
    let received = null;
    emitter.on('test', (data) => { received = data; });
    emitter.emit('test', { hello: 'world' });
    expect(received).toEqual({ hello: 'world' });
  });

  it('should support once subscription', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.once('test', () => { count++; });
    emitter.emit('test', null);
    emitter.emit('test', null);
    expect(count).toBe(1);
  });
});

describe('MessageBus', () => {
  it('should send and receive messages', () => {
    const bus = new MessageBus();
    let received = null;
    bus.subscribe('agent-a', 'TASK_ASSIGN', (msg) => { received = msg; });
    bus.send('agent-b', 'agent-a', 'TASK_ASSIGN', { taskId: 'T001' });
    expect(received).toBeTruthy();
    expect(received.type).toBe('TASK_ASSIGN');
    expect(received.payload.taskId).toBe('T001');
  });

  it('should log messages', () => {
    const bus = new MessageBus();
    bus.send('a', 'b', 'HEARTBEAT', {});
    const history = bus.getHistory();
    expect(history.length).toBe(1);
  });
});

describe('ContextStore', () => {
  it('should set and get values', () => {
    const store = new ContextStore();
    store.set('test:key', { foo: 'bar' }, 'system');
    const result = store.get('test:key');
    expect(result.value).toEqual({ foo: 'bar' });
    expect(result.version).toBe(1);
  });

  it('should increment version on updates', () => {
    const store = new ContextStore();
    store.set('v:key', 'initial', 'system');
    store.set('v:key', 'updated', 'system');
    const result = store.get('v:key');
    expect(result.version).toBe(2);
  });

  it('should acquire and release locks', () => {
    const store = new ContextStore();
    expect(store.acquireLock('file:app.js', 'agent-1')).toBe(true);
    expect(store.acquireLock('file:app.js', 'agent-2')).toBe(false);
    expect(store.releaseLock('file:app.js', 'agent-1')).toBe(true);
    expect(store.acquireLock('file:app.js', 'agent-2')).toBe(true);
  });
});

describe('TaskQueue', () => {
  it('should add and get ready tasks', () => {
    const queue = new TaskQueue();
    queue.add({ id: 'T1', title: 'Task 1', depends_on: [] });
    queue.add({ id: 'T2', title: 'Task 2', depends_on: ['T1'] });
    const ready = queue.getReady();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('T1');
  });

  it('should respect dependencies', () => {
    const queue = new TaskQueue();
    queue.add({ id: 'T1', title: 'Task 1', depends_on: [] });
    queue.add({ id: 'T2', title: 'Task 2', depends_on: ['T1'] });
    queue.start('T1');
    queue.complete('T1', null);
    const ready = queue.getReady();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('T2');
  });

  it('should detect circular dependencies', () => {
    const queue = new TaskQueue();
    queue.add({ id: 'A', title: 'A', depends_on: ['B'] });
    queue.add({ id: 'B', title: 'B', depends_on: ['A'] });
    expect(queue.hasCircularDependency()).toBe(true);
  });
});

describe('RetryHandler', () => {
  it('should succeed on first attempt', async () => {
    const handler = new RetryHandler();
    let calls = 0;
    const result = await handler.execute(async () => {
      calls++;
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(1);
  });

  it('should retry on failure', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelay: 10 });
    let calls = 0;
    const result = await handler.execute(async (attempt) => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(3);
  });

  it('should fail after max retries', async () => {
    const handler = new RetryHandler({ maxRetries: 2, baseDelay: 10 });
    let calls = 0;
    await expect(handler.execute(async () => {
      calls++;
      throw new Error('always fails');
    })).rejects.toThrow('always fails');
    expect(calls).toBe(2);
  });
});

describe('EscalationQueue', () => {
  it('should add and resolve escalations', () => {
    const queue = new EscalationQueue();
    const esc = queue.add({ id: 'T1', title: 'Task 1' }, 'TIMEOUT');
    expect(esc.status).toBe('pending');
    expect(queue.pendingCount()).toBe(1);
    expect(queue.resolve(esc.id)).toBe(true);
    expect(queue.pendingCount()).toBe(0);
  });
});