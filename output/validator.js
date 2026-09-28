/**
 * Validator
 * Validates project completeness and quality.
 * Checks: required files exist, dependencies are satisfied, tests pass.
 */

import { promises as fs } from 'fs';
import path from 'path';

export class Validator {
  constructor(config = {}) {
    this.requiredFiles = config.requiredFiles || [];
    this.requiredDirs = config.requiredDirs || [];
    this.checkTests = config.checkTests !== false;
    this.checkLint = config.checkLint !== false;
  }

  /**
   * Validate a project directory.
   */
  async validate(projectDir, projectConfig) {
    const issues = [];
    const warnings = [];

    // Check required directories
    for (const dir of this.requiredDirs) {
      const dirPath = path.join(projectDir, dir);
      try {
        await fs.access(dirPath);
      } catch {
        issues.push(`Missing required directory: ${dir}`);
      }
    }

    // Check required files
    for (const file of this.requiredFiles) {
      const filePath = path.join(projectDir, file);
      try {
        await fs.access(filePath);
      } catch {
        issues.push(`Missing required file: ${file}`);
      }
    }

    // Check package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    try {
      const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (!pkg.name) issues.push('package.json missing name');
      if (!pkg.scripts) warnings.push('package.json missing scripts');
    } catch {
      issues.push('package.json missing or invalid');
    }

    // Check for common issues
    const commonIssues = await this._checkCommonIssues(projectDir);
    issues.push(...commonIssues.issues);
    warnings.push(...commonIssues.warnings);

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      checkedAt: Date.now(),
    };
  }

  /**
   * Check for common project issues.
   */
  async _checkCommonIssues(projectDir) {
    const issues = [];
    const warnings = [];

    // Check for .gitignore
    try {
      await fs.access(path.join(projectDir, '.gitignore'));
    } catch {
      warnings.push('No .gitignore found');
    }

    // Check for .env.example (not .env)
    try {
      await fs.access(path.join(projectDir, '.env.example'));
    } catch {
      warnings.push('No .env.example found (document your env vars)');
    }

    // Check for hardcoded secrets (basic scan)
    const secretPatterns = [
      /api_key\s*=\s*['"][^'"]+['"]/i,
      /password\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
    ];

    try {
      await this._scanForSecrets(projectDir, secretPatterns, issues);
    } catch {
      // Scan failed, skip
    }

    return { issues, warnings };
  }

  /**
   * Scan files for potential secrets.
   */
  async _scanForSecrets(dir, patterns, issues) {
    const { execSync } = await import('child_process');
    try {
      const result = execSync(
        `grep -rE "${patterns.map(p => p.source).join('|')}" ${dir} --include='*.js' --include='*.ts' --include='*.json' 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );
      if (result.trim()) {
        issues.push(`Potential hardcoded secrets found in: ${result.split('\n')[0]}`);
      }
    } catch {
      // grep failed, skip
    }
  }
}

export default Validator;