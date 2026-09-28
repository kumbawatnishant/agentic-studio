/**
 * Architect Agent
 * Designs systems, schemas, and API contracts.
 * Does NOT write implementation code.
 */

import { BaseAgent } from './base-agent.js';

export class ArchitectAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
  }

  async performTask(task) {
    const { title, description, acceptance, context } = task;

    // Get any relevant context from shared store
    const projectContext = this.getContext('project:overview');
    const existingDesign = this.getContext('design:architecture');

    const prompt = `Design the following system component:

Task: ${title}
Description: ${description}
Acceptance Criteria: ${JSON.stringify(acceptance)}

${existingDesign ? `Existing Design:\n${JSON.stringify(existingDesign.value, null, 2)}` : ''}
${projectContext ? `Project Context:\n${JSON.stringify(projectContext.value, null, 2)}` : ''}

Provide your design as a JSON object with:
- context: What problem we're solving
- decision: What we chose and why
- consequences: Trade-offs accepted
- diagram: ASCII or Mermaid diagram
- filesToCreate: Array of exact file paths
- apiContracts: Array of API endpoint definitions
- databaseSchema: Table definitions with fields and relationships
- risks: Array of potential risks and mitigations

Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    // Write design to shared context
    this.setContext('design:architecture', result);
    this.setContext(`design:task:${task.id}`, result);

    return {
      success: true,
      data: {
        design: result,
        filesToCreate: result.filesToCreate || [],
      },
    };
  }
}

export default ArchitectAgent;