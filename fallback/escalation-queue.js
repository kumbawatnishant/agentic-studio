/**
 * Escalation Queue
 * Manages tasks that need human intervention.
 * Supports notifications and resolution tracking.
 */

export class EscalationQueue {
  constructor(config = {}) {
    this.escalations = [];
    this.maxSize = config.maxSize || 100;
    this.autoResolveTimeout = config.autoResolveTimeout || 30 * 60 * 1000; // 30 min
    this.onEscalate = config.onEscalate; // callback for notifications
  }

  /**
   * Add a task to the escalation queue.
   */
  add(task, reason, details = {}) {
    const escalation = {
      id: `esc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      taskId: task.id,
      taskTitle: task.title,
      reason,
      details,
      timestamp: Date.now(),
      status: 'pending',
      resolvedAt: null,
    };

    this.escalations.push(escalation);

    // Trim if too large
    if (this.escalations.length > this.maxSize) {
      this.escalations.shift();
    }

    // Notify
    if (this.onEscalate) {
      this.onEscalate(escalation);
    }

    console.log(`[Escalation] ${escalation.id}: ${task.id} - ${reason}`);
    return escalation;
  }

  /**
   * Get all pending escalations.
   */
  getPending() {
    return this.escalations.filter(e => e.status === 'pending');
  }

  /**
   * Get all escalations.
   */
  getAll() {
    return [...this.escalations];
  }

  /**
   * Resolve an escalation.
   */
  resolve(escalationId, resolvedBy = 'human') {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation) {
      escalation.status = 'resolved';
      escalation.resolvedAt = Date.now();
      escalation.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  /**
   * Auto-resolve escalations that have been pending too long (graceful degradation).
   */
  autoResolveStale() {
    const now = Date.now();
    let resolved = 0;
    for (const escalation of this.escalations) {
      if (escalation.status === 'pending' && (now - escalation.timestamp) > this.autoResolveTimeout) {
        escalation.status = 'auto_resolved';
        escalation.resolvedAt = now;
        escalation.resolvedBy = 'system';
        resolved++;
      }
    }
    return resolved;
  }

  /**
   * Get count of pending escalations.
   */
  pendingCount() {
    return this.escalations.filter(e => e.status === 'pending').length;
  }
}

export default EscalationQueue;