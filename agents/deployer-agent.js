/**
 * Deployer Agent
 * Handles full deployment pipeline: GitHub + Vercel.
 * Triggered after all agents complete.
 * Prepares files, creates repo, commits, deploys, verifies.
 */

import { BaseAgent } from './base-agent.js';
import { GitHubClient } from '../deploy/github-client.js';
import { VercelClient } from '../deploy/vercel-client.js';
import { EnvManager } from '../deploy/env-manager.js';
import { RollbackManager } from '../deploy/rollback-manager.js';

export class DeployerAgent extends BaseAgent {
  constructor(config, deps) {
    super(config, deps);
    this.github = config.github
      ? new GitHubClient(config.github.token, config.github.username, config.github.org)
      : null;
    this.vercel = config.vercel
      ? new VercelClient(config.vercel.token, config.vercel.teamId)
      : null;
    this.envManager = new EnvManager();
    this.rollbackManager = new RollbackManager(config.rollback || {});
    this.pipeline = config.pipeline || [
      'VERIFY_BUILD',
      'PREPARE_FILES',
      'CREATE_GITHUB_REPO',
      'COMMIT_AND_PUSH',
      'DEPLOY_TO_VERCEL',
      'VERIFY_DEPLOYMENT',
      'REPORT_STATUS',
    ];
  }

  async performTask(task) {
    const { project, files, env } = task.payload || task;

    if (!project || !project.name) {
      return { success: false, error: 'Project info required for deployment' };
    }

    const pipelineResults = {};
    let currentStep = null;

    try {
      for (const step of this.pipeline) {
        currentStep = step;
        pipelineResults[step] = await this.executeStep(step, project, files, env);
      }

      return {
        success: true,
        data: {
          githubUrl: pipelineResults.CREATE_GITHUB_REPO?.repoUrl || null,
          vercelUrl: pipelineResults.DEPLOY_TO_VERCEL?.url || null,
          deploymentId: pipelineResults.DEPLOY_TO_VERCEL?.id || null,
          steps: pipelineResults,
        },
      };
    } catch (error) {
      if (this.rollbackManager.shouldRollback() && currentStep !== 'VERIFY_BUILD') {
        await this.rollback(currentStep, pipelineResults);
      }
      return { success: false, error: error.message, step: currentStep, partialResults: pipelineResults };
    }
  }

  async executeStep(step, project, files, env) {
    const steps = {
      'VERIFY_BUILD': () => this.verifyBuild(project),
      'PREPARE_FILES': () => this.prepareFiles(project, files),
      'CREATE_GITHUB_REPO': () => this.createGitHubRepo(project),
      'COMMIT_AND_PUSH': () => this.commitAndPush(project, files),
      'DEPLOY_TO_VERCEL': () => this.deployToVercel(project, files, env),
      'VERIFY_DEPLOYMENT': () => this.verifyDeployment(project),
      'REPORT_STATUS': () => this.reportStatus(project),
    };

    if (!steps[step]) {
      throw new Error(`Unknown deployment step: ${step}`);
    }
    return await steps[step]();
  }

  // ─── VERIFY BUILD ──────────────────────────────────

  async verifyBuild(project) {
    const requiredFiles = project.requiredFiles || ['package.json', 'README.md', '.gitignore'];
    const missing = [];

    for (const f of requiredFiles) {
      const fileContext = this.getContext(`file:${f}`);
      if (!fileContext) {
        missing.push(f);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required files: ${missing.join(', ')}`);
    }

    return { verified: true, missingFiles: [] };
  }

  // ─── PREPARE FILES ─────────────────────────────────

  async prepareFiles(project, files) {
    const preparedFiles = [];

    // Collect all file contents from context store
    const fileList = files || [];
    for (const file of fileList) {
      const content = typeof file === 'string' ? file : file.content;
      const path = typeof file === 'string' ? file : file.path;
      preparedFiles.push({ path, content });
    }

    // Generate .env.example if env provided
    if (project.env) {
      const envExample = this.envManager.generateEnvExample(project.env);
      preparedFiles.push({ path: '.env.example', content: envExample });
    }

    // Ensure .gitignore exists
    const gitignore = this.getContext('file:.gitignore');
    if (!gitignore) {
      preparedFiles.push({
        path: '.gitignore',
        content: 'node_modules/\ndist/\n.next/\n.env\n.env.local\n*.log\n',
      });
    }

    // Generate README if not present
    const readme = this.getContext('file:README.md');
    if (!readme) {
      const readmeContent = `# ${project.name}\n\n${project.description || 'A project built with Agentic Studio'}\n\n## Getting Started\n\nSee deployment URL for live project.\n`;
      preparedFiles.push({ path: 'README.md', content: readmeContent });
    }

    return { files: preparedFiles, count: preparedFiles.length };
  }

  // ─── GITHUB ────────────────────────────────────────

  async createGitHubRepo(project) {
    if (!this.github) {
      return { created: false, skipReason: 'No GitHub client configured' };
    }

    const { name, description, visibility = 'public' } = project;
    return this.github.createRepo(name, description, visibility);
  }

  async commitAndPush(project, files) {
    if (!this.github) {
      return { pushed: false, skipReason: 'No GitHub client configured' };
    }

    const { name } = project;
    const fileBlobs = (files || []).map(f => ({
      path: f.path || f,
      content: typeof f === 'string' ? f : (f.content || ''),
    }));

    const result = await this.github.commitAndPush(name, fileBlobs, 'conventional');
    await this.github.setRepoSettings(name, this.config.github?.branch || 'main');

    return result;
  }

  // ─── VERCEL ────────────────────────────────────────

  async deployToVercel(project, files, env) {
    if (!this.vercel) {
      return { deployed: false, skipReason: 'No Vercel client configured' };
    }

    const { name } = project;
    const framework = this.config.vercel?.framework || 'auto-detect';
    const buildCommand = this.config.vercel?.buildCommand || 'auto';
    const outputDirectory = this.config.vercel?.outputDirectory || 'auto';
    const installCommand = this.config.vercel?.installCommand || 'auto';
    const nodeVersion = this.config.vercel?.nodeVersion || '20.x';

    // Build env vars (separate safe from secrets)
    let safeEnv = {};
    if (env && this.envManager) {
      const { safe } = this.envManager.buildDeployEnvVars(env);
      safeEnv = safe;
    }

    const deployment = await this.vercel.createDeployment(name, files || [], {
      framework,
      buildCommand,
      outputDirectory,
      installCommand,
      nodeVersion,
      env: safeEnv,
      regions: this.config.vercel?.regions || ['bom1'],
    });

    // Wait for deployment to complete
    const result = await this.vercel.waitForDeployment(deployment.id);

    // Record in rollback history
    this.rollbackManager.record(result);

    return result;
  }

  async verifyDeployment(project) {
    const checks = this.config.postDeployChecks || [
      { url: '/', expectedStatus: 200 },
      { url: '/health', expectedStatus: 200 },
    ];

    const vercelUrl = this.rollbackManager.getCurrent()?.url;
    if (!vercelUrl) {
      return { verified: false, reason: 'No deployment URL available' };
    }

    const results = [];
    for (const check of checks) {
      try {
        const response = await fetch(`https://${vercelUrl}${check.url}`, { timeout: 10000 });
        results.push({
          url: check.url,
          status: response.status,
          expected: check.expectedStatus,
          passed: response.status === check.expectedStatus,
        });
      } catch (err) {
        results.push({
          url: check.url,
          status: 'ERROR',
          expected: check.expectedStatus,
          passed: false,
          error: err.message,
        });
      }
    }

    const allPassed = results.every(r => r.passed);
    return { verified: allPassed, checks: results };
  }

  // ─── REPORT ────────────────────────────────────────

  async reportStatus(project) {
    const current = this.rollbackManager.getCurrent();
    const summary = this.rollbackManager.getSummary();

    return {
      project: project.name,
      deployment: current,
      rollbackSummary: summary,
      canRollback: this.rollbackManager.getRollbackTarget() !== null,
    };
  }

  // ─── ROLLBACK ──────────────────────────────────────

  async rollback(failedStep, pipelineResults) {
    if (!this.rollbackManager.shouldRollback()) return;

    console.log(`[Deployer] Rolling back from step: ${failedStep}`);

    // If Vercel deployment failed, rollback to last good
    if (pipelineResults.DEPLOY_TO_VERCEL) {
      const target = this.rollbackManager.getRollbackTarget();
      if (target) {
        try {
          if (this.vercel) {
            await this.vercel.rollback(target.id);
            console.log(`[Deployer] Rolled back to deployment: ${target.id}`);
          }
        } catch (err) {
          console.error(`[Deployer] Rollback failed: ${err.message}`);
        }
      }
    }
  }
}

export default DeployerAgent;
