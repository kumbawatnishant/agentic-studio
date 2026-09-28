/**
 * Reviewer Agent
 * Audits code for quality, security, and correctness.
 * Sends REVIEW_REQUEST messages and provides feedback.
 */

import { BaseAgent } from './base-agent.js';
import { MESSAGE_TYPES } from '../shared/message-bus.js';

export class ReviewerAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
  }

  async performTask(task) {
    const { title, description, acceptance, context, filesToReview } = task;

    // Get the code to review from context
    const codeFiles = [];
    for (const filePath of (filesToReview || [])) {
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
        error: 'No files found to review',
      };
    }

    const prompt = `Review the following code for quality, security, and correctness:

Task: ${title}
Description: ${description}
Acceptance Criteria: ${JSON.stringify(acceptance)}

Code Files:
${codeFiles.map(f => '--- ' + f.path + ' ---\n' + f.content).join('\n\n')}

Check for:
1. Bugs and logic errors
2. Security issues (OWASP Top 10)
3. Performance problems
4. Code style and readability
5. Test coverage
6. Hardcoded secrets or API keys
7. Accessibility (if UI code)

Return a JSON object with:
- approved: boolean (true if no blocking issues)
- issues: Array of { severity: "critical"|"high"|"medium"|"low", file, line, message, suggestion }
- summary: Brief overall assessment
- blockingIssues: Number of critical/high issues found

Return ONLY valid JSON.`;

    const result = await this.generateJSON(prompt);

    // Send review feedback via message bus
    this.send(task.requestedBy || 'coder', MESSAGE_TYPES.REVIEW_FEEDBACK, {
      taskId: task.id,
      review: result,
    });

    // Store review in context
    this.setContext(`review:task:${task.id}`, result);

    return {
      success: true,
      data: {
        approved: result.approved,
        issues: result.issues,
        summary: result.summary,
      },
    };
  }
}

export default ReviewerAgent;