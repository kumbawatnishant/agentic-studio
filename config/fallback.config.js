/**
 * Fallback Configuration
 * Defines fallback rules, thresholds, and escalation paths.
 */

export const FALLBACK_CONFIG = {
  // Retry settings
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // Watchdog settings
  watchdog: {
    checkInterval: 5000, // 5 seconds
    stuckThreshold: 60000, // 60 seconds
    maxRetriesBeforeEscalation: 3,
  },

  // Escalation settings
  escalation: {
    maxSize: 100,
    autoResolveTimeout: 30 * 60 * 1000, // 30 minutes
    notifyOnEscalate: true,
  },

  // Context compression settings
  context: {
    maxContextSize: 100000, // tokens
    compressionThreshold: 80000, // compress at 80%
    keepRecentN: 10, // keep last 10 entries uncompressed
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: 60,
    burstSize: 10,
    queueMaxSize: 100,
  },

  // Agent pool settings
  agentPool: {
    maxConcurrent: 3,
    maxAgents: 10,
    idleTimeout: 5 * 60 * 1000, // 5 minutes
  },
};

export default FALLBACK_CONFIG;