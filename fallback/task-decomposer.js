/**
 * Task Decomposer
 * Breaks large tasks into smaller sub-tasks when agents fail.
 * Uses LLM to split tasks intelligently.
 */

export class TaskDecomposer {
  constructor(llm) {
    this.llm = llm;
  }

  /**
   * Decompose a task into sub-tasks.
   * @param {object} task - The task to decompose
   */
  async decompose(task) {
    const prompt = `You are a task decomposition expert. Break this task into 3-5 smaller, independent sub-tasks.

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Acceptance criteria: ${JSON.stringify(task.acceptance || [])}

For each sub-task, provide:
- id: unique identifier (e.g., "sub-1")
- title: short title
- description: what needs to be done
- acceptance: array of acceptance criteria
- depends_on: array of sub-task IDs this depends on (empty array if none)

Return ONLY a valid JSON array. No markdown, no commentary.

Example:
[
  {
    "id": "sub-1",
    "title": "Set up project structure",
    "description": "Create directory layout and config files",
    "acceptance": ["Directories created", "Config files present"],
    "depends_on": []
  }
]`;

    try {
      const subTasks = await this.llm.generateJSON(prompt);
      if (Array.isArray(subTasks)) {
        return subTasks.map(st => ({
          ...st,
          id: `${task.id}_${st.id}`,
          originalTask: task.id,
          agent: task.agent,
        }));
      }
      throw new Error('Decomposition did not return an array');
    } catch (err) {
      console.error('[Decomposer] Failed to decompose task:', err.message);
      // Fallback: return the original task as a single sub-task
      return [{
        id: `${task.id}_fallback`,
        title: task.title,
        description: task.description,
        acceptance: task.acceptance || [],
        depends_on: [],
        originalTask: task.id,
        agent: task.agent,
      }];
    }
  }
}

export default TaskDecomposer;