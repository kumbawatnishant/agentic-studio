/**
 * Optimizer Agent
 * Runs after Coder, before Reviewer.
 * Replaces custom code with libraries, removes redundancy, simplifies complexity.
 * Does NOT write new features — only optimizes existing code.
 */

import { BaseAgent } from './base-agent.js';

export class OptimizerAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
    this.libraryRules = config.libraryRules || this._defaultLibraryRules();
    this.checks = config.checks || this._defaultChecks();
  }

  _defaultLibraryRules() {
    return {
      preferBuiltIn: true,
      allowedLibraries: [
        'lodash-es', 'date-fns', 'dayjs', 'uuid',
        'axios', 'zod', 'bcrypt', 'jsonwebtoken',
        'express-validator', 'clsx', 'tailwind-merge',
      ],
      bannedLibraries: ['moment', 'underscore'],
      maxBundleIncrease: 5000, // bytes
    };
  }

  _defaultChecks() {
    return {
      libraryOpportunities: true,
      redundantCode: true,
      builtInMethods: true,
      bundleSize: true,
      codeSmells: true,
      duplication: true,
    };
  }

  async performTask(task) {
    const { files, language, projectDependencies } = task;

    if (!files || files.length === 0) {
      return { success: true, data: { optimizedFiles: [], changes: [] } };
    }

    const allChanges = [];
    const optimizedFiles = [];

    for (const file of files) {
      // Skip non-optimizable files
      if (this._shouldSkipFile(file.path)) {
        optimizedFiles.push(file);
        continue;
      }

      const result = await this._optimizeFile(file, language, projectDependencies);
      optimizedFiles.push(result.file);
      allChanges.push(...result.changes);
    }

    // Write optimized files to context
    for (const file of optimizedFiles) {
      this.setContext(`file:${file.path}`, file.content);
    }

    const stats = this._calculateStats(files, optimizedFiles, allChanges);

    return {
      success: true,
      data: {
        optimizedFiles,
        changes: allChanges,
        stats,
      },
    };
  }

  /**
   * Optimize a single file.
   */
  async _optimizeFile(file, language, dependencies) {
    const { path: filePath, content: originalCode } = file;

    const prompt = `You are a code optimization expert. Optimize this ${language} code.

FILE: ${filePath}
EXISTING DEPENDENCIES: ${JSON.stringify(dependencies)}

CODE:
\`\`\`${language}
${originalCode}
\`\`\`${language}

Optimize for:
1. Replace custom code with library calls (date-fns, lodash-es, uuid, zod, etc.)
2. Remove redundant/unnecessary code
3. Use built-in methods instead of custom implementations
4. Remove dead code and unused variables
5. Simplify overly complex patterns
6. Keep the SAME functionality — do NOT change behavior

Return a JSON object:
{
  "optimizedCode": "the improved code",
  "changes": [
    {
      "type": "LIBRARY_REPLACE" | "REMOVE_REDUNDANT" | "USE_BUILTIN" | "SIMPLIFY" | "REMOVE_DEAD_CODE",
      "line": <line_number>,
      "original": "original code snippet",
      "replacement": "new code snippet",
      "reason": "why this change was made",
      "impact": "lines saved / bytes saved"
    }
  ],
  "warnings": ["any concerns or things to double-check"]
}

If no optimizations are possible, return the original code with an empty changes array.
Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    return {
      file: {
        path: filePath,
        content: result.optimizedCode || originalCode,
      },
      changes: (result.changes || []).map(c => ({
        ...c,
        file: filePath,
      })),
    };
  }

  /**
   * Determine if a file should be skipped.
   */
  _shouldSkipFile(filePath) {
    const skipPatterns = [
      /test\.|spec\./,           // Don't optimize tests
      /config\.|\.config\./,     // Don't optimize config
      /boilerplate/,
      /__tests__/,
      /node_modules/,
    ];
    return skipPatterns.some(p => p.test(filePath));
  }

  /**
   * Calculate optimization statistics.
   */
  _calculateStats(originalFiles, optimizedFiles, changes) {
    const linesBefore = originalFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const linesAfter = optimizedFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const librariesAdded = [...new Set(changes.filter(c => c.type === 'LIBRARY_REPLACE').map(c => c.library).filter(Boolean))];
    const codeRemoved = changes.filter(c => c.type === 'REMOVE_REDUNDANT' || c.type === 'REMOVE_DEAD_CODE').length;
    const codeReplaced = changes.filter(c => c.type === 'LIBRARY_REPLACE').length;
    const codeSimplified = changes.filter(c => c.type === 'SIMPLIFY' || c.type === 'USE_BUILTIN').length;

    return {
      linesBefore,
      linesAfter,
      linesSaved: linesBefore - linesAfter,
      librariesAdded,
      codeRemoved,
      codeReplaced,
      codeSimplified,
      totalChanges: changes.length,
    };
  }
}

export default OptimizerAgent;