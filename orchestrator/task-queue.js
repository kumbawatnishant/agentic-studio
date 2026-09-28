/**
 * Task Queue
 * Priority queue with dependency graph.
 * Tasks are executed in dependency order; independent tasks run in parallel.
 * Detects circular dependencies.
 */

export class TaskQueue {
  constructor() {
    this.tasks = new Map(); // id -> task
    this.completed = new Set();
    this.failed = new Set();
    this.inProgress = new Set();
    this.history = [];
  }

  /**
   * Add a task to the queue.
   */
  add(task) {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} already exists`);
    }
    this.tasks.set(task.id, task);
  }

  /**
   * Add multiple tasks.
   */
  addAll(tasks) {
    for (const task of tasks) {
      this.add(task);
    }
  }

  /**
   * Get the next ready task(s) — dependencies satisfied, not yet completed/failed/in-progress.
   * Returns an array (can be multiple for parallel execution).
   */
  getReady(maxCount = 1) {
    const ready = [];
    for (const [id, task] of this.tasks) {
      if (this.completed.has(id) || this.failed.has(id) || this.inProgress.has(id)) {
        continue;
      }

      // Check if all dependencies are satisfied
      const depsSatisfied = (task.depends_on || []).every(depId => {
        return this.completed.has(depId);
      });

      // Check if any dependency failed
      const depsFailed = (task.depends_on || []).some(depId => {
        return this.failed.has(depId);
      });

      if (depsFailed) {
        this.failed.add(id);
        task.status = 'blocked';
        continue;
      }

      if (depsSatisfied) {
        ready.push(task);
        if (ready.length >= maxCount) break;
      }
    }
    return ready;
  }

  /**
   * Mark a task as in progress.
   */
  start(taskId) {
    this.inProgress.add(taskId);
    const task = this.tasks.get(taskId);
    if (task) task.status = 'in_progress';
  }

  /**
   * Mark a task as completed.
   */
  complete(taskId, result = null) {
    this.inProgress.delete(taskId);
    this.completed.add(taskId);
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'done';
      task.result = result;
    }
    this.history.push({ taskId, status: 'completed', timestamp: Date.now() });
  }

  /**
   * Mark a task as failed.
   */
  fail(taskId, error = null) {
    this.inProgress.delete(taskId);
    this.failed.add(taskId);
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
    }
    this.history.push({ taskId, status: 'failed', error, timestamp: Date.now() });
  }

  /**
   * Mark a task as blocked (dependency failed).
   */
  block(taskId) {
    this.failed.add(taskId);
    const task = this.tasks.get(taskId);
    if (task) task.status = 'blocked';
  }

  /**
   * Get task by ID.
   */
  get(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks with a given status.
   */
  getByStatus(status) {
    const result = [];
    for (const task of this.tasks.values()) {
      if (task.status === status) result.push(task);
    }
    return result;
  }

  /**
   * Get all tasks.
   */
  getAll() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get count of remaining (not completed, not failed, not blocked).
   */
  remaining() {
    let count = 0;
    for (const id of this.tasks.keys()) {
      if (!this.completed.has(id) && !this.failed.has(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get progress as percentage.
   */
  progress() {
    const total = this.tasks.size;
    if (total === 0) return 100;
    const done = this.completed.size;
    return Math.round((done / total) * 100);
  }

  /**
   * Check for circular dependencies using topological sort.
   * Returns true if a cycle exists.
   */
  hasCircularDependency() {
    const visited = new Set();
    const inStack = new Set();
    const tasks = this.tasks;

    function dfs(taskId) {
      if (inStack.has(taskId)) return true; // cycle
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      inStack.add(taskId);

      const task = tasks.get(taskId);
      if (task) {
        for (const dep of (task.depends_on || [])) {
          if (dfs(dep)) return true;
        }
      }

      inStack.delete(taskId);
      return false;
    }

    for (const id of tasks.keys()) {
      if (dfs(id)) return true;
    }
    return false;
  }

  /**
   * Get tasks that depend on a given task.
   */
  getDependents(taskId) {
    const result = [];
    for (const task of this.tasks.values()) {
      if ((task.depends_on || []).includes(taskId)) {
        result.push(task);
      }
    }
    return result;
  }

  /**
   * Reset the queue (for re-runs).
   */
  reset() {
    this.completed.clear();
    this.failed.clear();
    this.inProgress.clear();
    this.history = [];
    for (const task of this.tasks.values()) {
      task.status = 'todo';
      task.result = undefined;
      task.error = undefined;
    }
  }
}

export default TaskQueue;