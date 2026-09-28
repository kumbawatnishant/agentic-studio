import { Orchestrator } from './orchestrator/orchestrator.js';
import { ArchitectAgent } from './agents/architect-agent.js';
import { CoderAgent } from './agents/coder-agent.js';
import { OptimizerAgent } from './agents/optimizer-agent.js';
import { ReviewerAgent } from './agents/reviewer-agent.js';
import { TesterAgent } from './agents/tester-agent.js';
import { DocsAgent } from './agents/docs-agent.js';
import { DeployerAgent } from './agents/deployer-agent.js';
import { BaseAgent } from './agents/base-agent.js';
import AGENT_CONFIGS from './config/agents.config.js';

/**
 * Create a pre-configured orchestrator with all agents registered.
 */
export async function createOrchestrator(config = {}) {
  const orchestrator = new Orchestrator({
    dbPath: config.dbPath || ':memory:',
    model: config.model || 'gemini-3.6-flash',
    apiKey: config.apiKey || process.env.GEMINI_API_KEY,
    maxConcurrent: config.maxConcurrent || 3,
    projectName: config.projectName,
    projectDescription: config.projectDescription,
    techStack: config.techStack,
    ...config,
  });

  // Wire output components if not already provided
  if (!orchestrator.assembler) {
    const { ProjectAssembler } = await import('./output/project-assembler.js');
    const { Validator } = await import('./output/validator.js');
    const { Packager } = await import('./output/packager.js');
    const validator = new Validator({
      requiredFiles: config.requiredFiles || ['package.json', 'README.md'],
    });
    orchestrator.assembler = new ProjectAssembler({
      contextStore: orchestrator.contextStore,
      validator,
      outputDir: config.outputDir || './output',
    });
    orchestrator.validator = validator;
    orchestrator.packager = new Packager({
      format: config.packageFormat || 'tarball',
      outputDir: config.outputDir || './output',
    });
  }

  // Register agent classes for role-based instantiation
  orchestrator._agentClasses = {
    base: BaseAgent,
    architect: ArchitectAgent,
    coder: CoderAgent,
    optimizer: OptimizerAgent,
    reviewer: ReviewerAgent,
    tester: TesterAgent,
    docs: DocsAgent,
    deployer: DeployerAgent,
    'project-manager': BaseAgent,
  };

  // Register default agent configs
  orchestrator.registerDefaultAgents();

  return orchestrator;
}

/**
 * Run a project from a task list.
 */
export async function runProject(projectConfig, options = {}) {
  const orchestrator = await createOrchestrator(options);

  // Initialize agents
  const roles = options.roles || ['architect', 'coder', 'optimizer', 'reviewer', 'tester', 'docs', 'deployer'];
  orchestrator.initAgents(roles);

  // Add tasks
  if (projectConfig.tasks) {
    orchestrator.addTasks(projectConfig.tasks);
  }

  // Set project context
  orchestrator.contextStore.set('project:overview', {
    name: projectConfig.name,
    description: projectConfig.description,
    techStack: projectConfig.techStack,
  });

  // Run
  const result = await orchestrator.run(options.runConfig);

  // Print status
  console.log('\n=== Project Status ===');
  console.log(JSON.stringify(orchestrator.getStatus(), null, 2));

  // Cleanup
  orchestrator.shutdown();

  return result;
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2];

  if (command === 'run') {
    const configPath = process.argv[3];
    if (!configPath) {
      console.error('Usage: node index.js run <config.json>');
      process.exit(1);
    }
    // Read and parse JSON config file
    const { readFileSync } = await import('fs');
    const resolvedPath = configPath.startsWith('/') ? configPath : `${process.cwd()}/${configPath}`;
    const projectConfig = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
    const result = await runProject(projectConfig);
    console.log('\nResult:', JSON.stringify(result, null, 2));
  } else if (command === 'status') {
    const orchestrator = await createOrchestrator();
    console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
  } else {
    console.log('Usage:');
    console.log('  node index.js run <config.json>  - Run a project');
    console.log('  node index.js status             - Show system status');
  }
}

export default { createOrchestrator, runProject };