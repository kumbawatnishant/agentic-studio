/**
 * Backup Agent Factory
 * Creates backup agents with different models/providers for the same role.
 * Used when the primary agent fails.
 */

import { BaseAgent } from '../agents/base-agent.js';

export class BackupAgentFactory {
  constructor(config = {}) {
    this.backupConfigs = config.backupConfigs || {};
    this.deps = config.deps || {};
  }

  /**
   * Register a backup configuration for a role.
   */
  registerBackup(role, config) {
    if (!this.backupConfigs[role]) {
      this.backupConfigs[role] = [];
    }
    this.backupConfigs[role].push(config);
  }

  /**
   * Create a backup agent for a given role.
   */
  createBackup(role, overrideConfig = {}) {
    const configs = this.backupConfigs[role] || [];
    if (configs.length === 0) return null;

    // Pick the first available backup config
    const config = { ...configs[0], ...overrideConfig };
    const agent = new BaseAgent(config, this.deps);
    return agent;
  }

  /**
   * Create backups for all configured roles.
   */
  createAllBackups() {
    const agents = [];
    for (const [role, configs] of Object.entries(this.backupConfigs)) {
      for (const config of configs) {
        const agent = new BaseAgent(config, this.deps);
        agents.push(agent);
      }
    }
    return agents;
  }
}

export default BackupAgentFactory;