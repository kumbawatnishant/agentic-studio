/**
 * Context Store
 * SQLite-backed shared context window.
 * All agents read/write to a single source of truth.
 * Supports version vectors for conflict detection and file-level locks.
 */

import Database from 'better-sqlite3';
import { EventEmitter } from './event-emitter.js';

// Local UUID generator (avoids uuid package ESM issues)
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ContextStore {
  constructor(dbPath = ':memory:') {
    this.db = new Database(dbPath);
    this.emitter = new EventEmitter();
    this.locks = new Map(); // file -> { agent, acquiredAt }
    this.lockTimeout = 30000; // 30s max hold
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'json',
        version INTEGER DEFAULT 1,
        updated_by TEXT,
        updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
        CHECK (typeof(version) = 'integer')
      );

      CREATE TABLE IF NOT EXISTS context_history (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT,
        changed_at INTEGER DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_context_updated ON context(updated_at);
      CREATE INDEX IF NOT EXISTS idx_context_history_key ON context_history(key);
    `);
  }

  /**
   * Read a value from context. Returns parsed JSON if type is 'json'.
   */
  get(key) {
    const row = this.db.prepare('SELECT * FROM context WHERE key = ?').get(key);
    if (!row) return null;

    let value = row.value;
    if (row.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string if parse fails
      }
    }
    return { value, version: row.version, updatedBy: row.updated_by, updatedAt: row.updated_at };
  }

  /**
   * Set a value in context. Atomic write with version increment.
   * Emits CONTEXT_UPDATED event.
   */
  set(key, value, updatedBy = 'system', type = 'json') {
    const serialized = type === 'json' ? JSON.stringify(value) : String(value);
    const existing = this.db.prepare('SELECT version FROM context WHERE key = ?').get(key);
    const newVersion = (existing?.version || 0) + 1;

    // Record history
    this.db.prepare(`
      INSERT INTO context_history (id, key, old_value, new_value, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), key, existing ? existing.value : null, serialized, updatedBy);

    // Upsert
    this.db.prepare(`
      INSERT INTO context (key, value, type, version, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s','now') * 1000)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        version = excluded.version,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `).run(key, serialized, type, newVersion, updatedBy);

    this.emitter.emit('context:updated', { key, version: newVersion, updatedBy });
    return { version: newVersion };
  }

  /**
   * Delete a key from context.
   */
  delete(key) {
    this.db.prepare('DELETE FROM context WHERE key = ?').run(key);
    this.emitter.emit('context:updated', { key, version: 0, updatedBy: 'system', deleted: true });
  }

  /**
   * List all keys, optionally filtered by prefix.
   */
  list(prefix = '') {
    let query = 'SELECT key, version, updated_by, updated_at FROM context';
    let params = [];
    if (prefix) {
      query += ' WHERE key LIKE ?';
      params.push(`${prefix}%`);
    }
    query += ' ORDER BY updated_at DESC';
    return this.db.prepare(query).all(...params);
  }

  /**
   * Acquire a file-level lock. Returns true if acquired.
   */
  acquireLock(fileKey, agentId) {
    const existing = this.locks.get(fileKey);
    const now = Date.now();

    // Clean up expired locks
    if (existing && now - existing.acquiredAt > this.lockTimeout) {
      this.locks.delete(fileKey);
    }

    if (existing && existing.agent !== agentId) {
      return false; // Locked by another agent
    }

    this.locks.set(fileKey, { agent: agentId, acquiredAt: now });
    this.emitter.emit('context:locked', { file: fileKey, agent: agentId });
    return true;
  }

  /**
   * Release a file-level lock.
   */
  releaseLock(fileKey, agentId) {
    const existing = this.locks.get(fileKey);
    if (existing && existing.agent === agentId) {
      this.locks.delete(fileKey);
      this.emitter.emit('context:unlocked', { file: fileKey, agent: agentId });
      return true;
    }
    return false;
  }

  /**
   * Check if a file is locked.
   */
  isLocked(fileKey) {
    const existing = this.locks.get(fileKey);
    if (!existing) return false;
    if (Date.now() - existing.acquiredAt > this.lockTimeout) {
      this.locks.delete(fileKey);
      return false;
    }
    return true;
  }

  /**
   * Get full context snapshot (for new agents joining).
   */
  snapshot() {
    const rows = this.db.prepare('SELECT * FROM context').all();
    const result = {};
    for (const row of rows) {
      let value = row.value;
      if (row.type === 'json') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string
        }
      }
      result[row.key] = { value, version: row.version, updatedBy: row.updated_by, updatedAt: row.updated_at };
    }
    return result;
  }

  /**
   * Subscribe to context updates.
   */
  onUpdate(callback) {
    this.emitter.on('context:updated', callback);
    return () => this.emitter.off('context:updated', callback);
  }

  onLock(callback) {
    this.emitter.on('context:locked', callback);
    return () => this.emitter.off('context:locked', callback);
  }

  /**
   * Close the database.
   */
  close() {
    this.db.close();
  }
}

export default ContextStore;