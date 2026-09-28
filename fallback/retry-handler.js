/**
 * Retry Handler
 * Exponential backoff retry logic for LLM calls and agent tasks.
 */

export class RetryHandler {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
  }

  /**
   * Execute a function with retry logic.
   * @param {function} fn - Async function to execute
   * @param {object} options
   */
  async execute(fn, options = {}) {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;

        // Don't retry on certain errors
        if (this._shouldNotRetry(err)) {
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = this._calculateDelay(attempt);
          await this._sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculate delay with exponential backoff and jitter.
   */
  _calculateDelay(attempt) {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
      this.maxDelay
    );
    // Add jitter: +/- 25%
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(100, delay + jitter);
  }

  /**
   * Determine if an error should not be retried.
   */
  _shouldNotRetry(err) {
    const message = err.message || '';
    // Authentication errors, invalid arguments that can't be fixed
    if (message.includes('401') || message.includes('403') || message.includes('API key')) {
      return true;
    }
    // Schema validation failures (won't fix on retry)
    if (message.includes('Schema validation failed')) {
      return true;
    }
    return false;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RetryHandler;