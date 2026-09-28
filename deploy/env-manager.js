/**
 * Environment Manager
 * Creates .env.example, sanitizes .env, manages deployment env vars.
 */

export class EnvManager {
  constructor() {
    this.sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i,
      /database_url/i,
      /db_url/i,
      /aws/i,
      /credential/i,
    ];
  }

  /**
   * Generate .env.example from a .env file content.
   * Strips all values, keeps variable names.
   */
  generateEnvExample(envContent) {
    const lines = (envContent || '').split('\n');
    const exampleLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        exampleLines.push(trimmed);
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > -1) {
        const key = trimmed.substring(0, eqIndex).trim();
        const comment = trimmed.substring(eqIndex + 1).trim();
        // Preserve comments, blank the value
        if (comment && !comment.startsWith('#')) {
          exampleLines.push(`${key}=${comment}`);
        } else if (comment.startsWith('#')) {
          exampleLines.push(`${key}=`);
          exampleLines.push(`  ${comment}`);
        } else {
          exampleLines.push(`${key}=`);
        }
      } else {
        exampleLines.push(trimmed);
      }
    }

    return exampleLines.join('\n');
  }

  /**
   * Check if content contains sensitive data.
   */
  containsSecrets(content) {
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(content)) {
        const match = pattern.exec(content)[0];
        return { found: true, pattern: match };
      }
    }
    return { found: false };
  }

  /**
   * Sanitize content for safe logging/display.
   */
  sanitizeForLog(content) {
    let sanitized = content || '';
    for (const pattern of this.sensitivePatterns) {
      // Replace key=value pairs where key matches the pattern
      sanitized = sanitized.replace(
        new RegExp(`(${pattern.source})(=)([^\\s,;]+)`, 'gi'),
        '$1=***REDACTED***'
      );
    }
    return sanitized;
  }

  /**
   * Validate that required env vars are present.
   */
  validateRequired(envVars, requiredKeys) {
    const missing = [];
    for (const key of requiredKeys) {
      if (!envVars || !envVars[key]) {
        missing.push(key);
      }
    }
    return {
      valid: missing.length === 0,
      missing,
      present: requiredKeys.filter(k => envVars && envVars[k]),
    };
  }

  /**
   * Build env var object from a .env file content.
   */
  parseEnvContent(content) {
    const env = {};
    const lines = (content || '').split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > -1) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        env[key] = value;
      }
    }

    return env;
  }

  /**
   * Generate environment variables for Vercel deployment.
   * Excludes secrets (they are set via Vercel dashboard/API directly).
   */
  buildDeployEnvVars(envContent, excludePatterns = this.sensitivePatterns) {
    const env = this.parseEnvContent(envContent);
    const safe = {};
    const secrets = {};

    for (const [key, value] of Object.entries(env)) {
      const isSensitive = excludePatterns.some(p => p.test(key));
      if (isSensitive) {
        secrets[key] = value;
      } else {
        safe[key] = value;
      }
    }

    return { safe, secrets };
  }
}

export default EnvManager;
