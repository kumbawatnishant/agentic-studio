/**
 * Docs Agent
 * Creates clear, accurate documentation.
 * Writes README, API docs, setup guides, and CHANGELOG.
 */

import { BaseAgent } from './base-agent.js';

export class DocsAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
  }

  async performTask(task) {
    const { title, description, acceptance, context, docType } = task;

    // Get project context
    const projectContext = this.getContext('project:overview');
    const architecture = this.getContext('design:architecture');
    const files = this.contextStore?.list('file:') || [];

    const prompt = `Create documentation for the following:

Task: ${title}
Description: ${description}
Document Type: ${docType || 'README'}
Acceptance Criteria: ${JSON.stringify(acceptance)}

Project Context:
${projectContext ? JSON.stringify(projectContext.value, null, 2) : 'Not available'}

Architecture:
${architecture ? JSON.stringify(architecture.value, null, 2) : 'Not available'}

Existing Files:
${files.map(f => f.key).join('\n')}

Requirements:
- Write clear, accurate documentation
- Use markdown formatting
- Include code examples where helpful
- Structure with headings, subheadings, and bullet points
- Keep it concise but complete

Return a JSON object with:
- files: Array of { path, content } for each documentation file
- summary: Brief description of what was documented

Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    // Write docs to context
    const writtenDocs = [];
    for (const file of result.files || []) {
      this.setContext(`file:${file.path}`, file.content);
      writtenDocs.push(file.path);
    }

    return {
      success: true,
      data: {
        files: writtenDocs,
        summary: result.summary,
      },
    };
  }
}

export default DocsAgent;