/**
 * Tester Agent
 * Writes tests, performs security audits, validates acceptance criteria.
 * Reports bugs but does NOT fix them.
 */

import { BaseAgent } from './base-agent.js';

export class TesterAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
  }

  async performTask(task) {
    const { title, description, acceptance, context, filesToTest } = task;

    // Get the code to test from context
    const codeFiles = [];
    for (const filePath of (filesToTest || [])) {
      const fileContext = this.getContext(`file:${filePath}`);
      if (fileContext) {
        codeFiles.push({
          path: filePath,
          content: fileContext.value,
        });
      }
    }

    if (codeFiles.length === 0) {
      return {
        success: false,
        error: 'No files found to test',
      };
    }

    const prompt = `Write comprehensive tests for the following code:

Task: ${title}
Description: ${description}
Acceptance Criteria: ${JSON.stringify(acceptance)}

Code Files:
${codeFiles.map(f => '--- ' + f.path + ' ---\n' + f.content).join('\n\n')}

Requirements:
- Write unit tests using Vitest
- Write integration tests where applicable
- Cover all acceptance criteria
- Include edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

Return a JSON object with:
- testFiles: Array of { path, content } for each test file
- coverage: Estimated coverage percentage
- acceptanceCoverage: Array of { criterion, covered: boolean }
- potentialBugs: Array of { severity, description, location }

Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    // Write test files to context
    const writtenTests = [];
    for (const test of result.testFiles || []) {
      this.setContext(`file:${test.path}`, test.content);
      writtenTests.push(test.path);
    }

    // Report any potential bugs
    if (result.potentialBugs && result.potentialBugs.length > 0) {
      this.setContext(`bugs:task:${task.id}`, result.potentialBugs);
    }

    return {
      success: true,
      data: {
        testFiles: writtenTests,
        coverage: result.coverage,
        acceptanceCoverage: result.acceptanceCoverage,
        potentialBugs: result.potentialBugs,
      },
    };
  }
}

export default TesterAgent;