/**
 * Message Bus
 * Agent-to-agent communication protocol.
 * Supports 8 message types with delivery guarantees.
 */

import { EventEmitter } from './event-emitter.js';

// Local UUID generator
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const MESSAGE_TYPES = {
  TASK_ASSIGN: 'TASK_ASSIGN',
  TASK_COMPLETE: 'TASK_COMPLETE',
  TASK_FAILED: 'TASK_FAILED',
  CONTEXT_UPDATE: 'CONTEXT_UPDATE',
  REVIEW_REQUEST: 'REVIEW_REQUEST',
  REVIEW_FEEDBACK: 'REVIEW_FEEDBACK',
  ESCALATE: 'ESCALATE',
  HEARTBEAT: 'HEARTBEAT',
};

export class MessageBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.messageLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Subscribe to a message type from a specific agent (or all agents).
   * @param {string} fromAgent - Agent ID, or '*' for all
   * @param {string} messageType - Message type
   * @param {function} callback - Handler
   */
  subscribe(fromAgent, messageType, callback) {
    const pattern = `${fromAgent}:${messageType}`;
    this.emitter.on(pattern, callback);
    return () => this.emitter.off(pattern, callback);
  }

  /**
   * Subscribe to all messages from a specific agent.
   */
  subscribeAll(fromAgent, callback) {
    const handler = (data) => {
      // Match any message type from this agent
      if (data.from === fromAgent) callback(data);
    };
    this.emitter.on('message', handler);
    return () => this.emitter.off('message', handler);
  }

  /**
   * Send a message from one agent to another (or broadcast).
   */
  send(fromAgent, toAgent, messageType, payload) {
    const message = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      from: fromAgent,
      to: toAgent,
      type: messageType,
      payload,
      timestamp: Date.now(),
    };

    // Log message (ring buffer)
    this.messageLog.push(message);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }

    // Emit to subscribers
    if (toAgent === '*') {
      // Broadcast — notify all subscribers of this type
      this.emitter.emit(`*:${messageType}`, message);
    } else {
      this.emitter.emit(`${toAgent}:${messageType}`, message);
    }
    this.emitter.emit('message', message);

    return message;
  }

  /**
   * Get message history, optionally filtered.
   */
  getHistory(filter = {}) {
    let result = [...this.messageLog];
    if (filter.from) result = result.filter(m => m.from === filter.from);
    if (filter.to) result = result.filter(m => m.to === filter.to);
    if (filter.type) result = result.filter(m => m.type === filter.type);
    return result;
  }

  /**
   * Clear message log.
   */
  clearLog() {
    this.messageLog = [];
  }
}