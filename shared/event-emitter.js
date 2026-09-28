/**
 * Event Emitter
 * Lightweight pub/sub for agent communication and system events.
 * Replaces console-only logging with a structured event system.
 */

export class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      const idx = cbs.indexOf(callback);
      if (idx > -1) cbs.splice(idx, 1);
    }
  }

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      // Copy to allow listeners to modify the list during emit
      [...cbs].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventEmitter] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  clear() {
    this.listeners.clear();
  }
}

// Standard system events
export const SYSTEM_EVENTS = {
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_STUCK: 'agent:stuck',
  AGENT_FAILED: 'agent:failed',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  TASK_RETRYING: 'task:retrying',
  CONTEXT_UPDATED: 'context:updated',
  CONTEXT_LOCKED: 'context:locked',
  CONTEXT_UNLOCKED: 'context:unlocked',
  FALLBACK_TRIGGERED: 'fallback:triggered',
  FALLBACK_RESOLVED: 'fallback:resolved',
  ESCALATION_CREATED: 'escalation:created',
  ESCALATION_RESOLVED: 'escalation:resolved',
  PROJECT_COMPLETE: 'project:complete',
  SYSTEM_ERROR: 'system:error',
};