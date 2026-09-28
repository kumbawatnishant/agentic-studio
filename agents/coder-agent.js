/**
 * Coder Agent
 * Implements features based on architect's specs.
 * Writes clean, working code with tests.
 */

import { BaseAgent } from './base-agent.js';

export class CoderAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
  }

  async performTask(task) {
    const { title, description, acceptance, context, files } = task;

    // Get design context
    const design = this.getContext('design:architecture');
    const designForTask = this.getContext(`design:task:${task.id}`);

    const designContext = designForTask
      ? JSON.stringify(designForTask.value, null, 2)
      : design
        ? JSON.stringify(design.value, null, 2)
        : 'No design available. Use standard patterns.';

    const prompt = `Implement the following feature:

Task: ${title}
Description: ${description}
Acceptance Criteria: ${JSON.stringify(acceptance)}
${files ? `Target Files: ${JSON.stringify(files)}` : ''}

Design Specification:
${designContext}

Requirements:
- Write clean, working code
- Use TypeScript for type safety
- Follow the project's existing patterns
- Include error handling
- Write unit tests alongside the implementation
- Do NOT commit to main — use a feature branch

Return a JSON object with:
- files: Array of { path, content } for each file to create/modify
- tests: Array of { path, content } for test files
- summary: Brief description of what was implemented

Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    // Write files to context store
    const writtenFiles = [];
    for (const file of result.files || []) {
      this.setContext(`file:${file.path}`, file.content);
      writtenFiles.push(file.path);
    }
    for (const test of result.tests || []) {
      this.setContext(`file:${test.path}`, test.content);
      writtenFiles.push(test.path);
    }

    return {
      success: true,
      data: {
        files: writtenFiles,
        summary: result.summary,
      },
    };
  }
}

export default CoderAgent;