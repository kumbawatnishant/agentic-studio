/**
 * Rollback Manager
 * Manages deployment rollbacks, keeps history, auto-rollback on failure.
 */

export class RollbackManager {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.keepLastN = config.keepLastN || 3;
    this.autoRollbackOnFailure = config.autoRollbackOnFailure !== false;
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Record a deployment in history.
   */
  record(deployment) {
    this.history.push({
      id: deployment.id,
      url: deployment.url,
      state: deployment.state,
      timestamp: Date.now(),
      success: deployment.state === 'READY',
    });

    // Trim old deployments
    if (this.history.length > this.keepLastN) {
      this.history.shift();
    }

    this.currentIndex = this.history.length - 1;
  }

  /**
   * Get the last successful deployment.
   */
  getLastSuccessful() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].success && this.history[i].state === 'READY') {
        return { ...this.history[i], index: i };
      }
    }
    return null;
  }

  /**
   * Get the current deployment.
   */
  getCurrent() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return { ...this.history[this.currentIndex], index: this.currentIndex };
    }
    return null;
  }

  /**
   * Get rollback target (previous good deployment).
   */
  getRollbackTarget() {
    const current = this.getCurrent();
    if (!current) return null;

    // Find the most recent successful deployment before current
    for (let i = current.index - 1; i >= 0; i--) {
      if (this.history[i].success) {
        return { ...this.history[i], index: i };
      }
    }

    return null;
  }

  /**
   * Should we auto-rollback?
   */
  shouldRollback() {
    return this.enabled && this.autoRollbackOnFailure;
  }

  /**
   * Get full history.
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get history as a summary.
   */
  getSummary() {
    return {
      total: this.history.length,
      successful: this.history.filter(d => d.success).length,
      failed: this.history.filter(d => !d.success).length,
      current: this.getCurrent(),
      canRollback: this.getRollbackTarget() !== null,
    };
  }
}

export default RollbackManager;
