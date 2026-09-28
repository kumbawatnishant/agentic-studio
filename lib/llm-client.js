/**
 * LLM Client
 * Wrapper around Gemini REST API with:
 * - Retry with exponential backoff
 * - JSON schema validation
 * - Timeout handling
 * - Token budget tracking
 */

export class LLMClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = config.model || 'gemini-2.0-flash';
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.requestCount = 0;
    this.tokenCount = 0;
  }

  /**
   * Generate text from a prompt.
   * @param {string} prompt - The prompt
   * @param {object} options - { temperature, maxOutputTokens, timeout }
   */
  async generate(prompt, options = {}) {
    const {
      temperature = 0.2,
      maxOutputTokens = 8192,
      timeout = this.timeout,
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this._callAPI(prompt, { temperature, maxOutputTokens, timeout });
        this.requestCount++;
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate and parse JSON. Retries on parse failure.
   * @param {string} prompt
   * @param {object} schema - Zod schema for validation
   * @param {object} options
   */
  async generateJSON(prompt, schema, options = {}) {
    const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON. No markdown, no commentary, no code fences.`;

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const raw = await this._callAPI(jsonPrompt, options);
        this.requestCount++;

        // Try to extract JSON from the response
        const parsed = this._extractJSON(raw);

        if (schema) {
          const result = schema.safeParse(parsed);
          if (result.success) {
            return result.data;
          }
          throw new Error(`Schema validation failed: ${result.error.issues.map(i => i.message).join(', ')}`);
        }

        return parsed;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }
    throw lastError;
  }

  /**
   * Internal API call with timeout.
   */
  async _callAPI(prompt, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      };

      const response = await fetch(
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`LLM API error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();

      // Track token usage
      if (data.usageMetadata) {
        this.tokenCount += (data.usageMetadata.totalTokenCount || 0);
      }

      // Extract text
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('LLM response missing text content');
      }

      return text;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${options.timeout || this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract JSON from LLM response, handling markdown fences and extra text.
   */
  _extractJSON(text) {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Continue
    }

    // Try to find JSON in code fences
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1]);
      } catch {
        // Continue
      }
    }

    // Try to find a JSON object or array
    const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1]);
      } catch {
        // Continue
      }
    }

    throw new Error('No valid JSON found in LLM response');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      tokenCount: this.tokenCount,
      model: this.model,
    };
  }
}

export default LLMClient;