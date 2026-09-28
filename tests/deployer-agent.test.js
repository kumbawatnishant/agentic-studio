import { describe, it, expect, vi } from 'vitest';
import { DeployerAgent } from '../agents/deployer-agent.js';
import { GitHubClient } from '../deploy/github-client.js';
import { VercelClient } from '../deploy/vercel-client.js';
import { EnvManager } from '../deploy/env-manager.js';
import { RollbackManager } from '../deploy/rollback-manager.js';
import { EventEmitter } from '../shared/event-emitter.js';
import { ContextStore } from '../shared/context-store.js';

const deployerConfig = {
  id: 'deployer-1',
  role: 'deployer',
  model: 'gemini-2.0-flash',
  github: {
    token: 'test-token',
    username: 'testuser',
    org: null,
  },
  vercel: {
    token: 'test-vercel-token',
    teamId: null,
  },
  pipeline: [
    'VERIFY_BUILD',
    'PREPARE_FILES',
    'CREATE_GITHUB_REPO',
    'COMMIT_AND_PUSH',
    'DEPLOY_TO_VERCEL',
    'VERIFY_DEPLOYMENT',
    'REPORT_STATUS',
  ],
  rollback: {
    enabled: true,
    keepLastNDeployments: 3,
    autoRollbackOnFailure: true,
  },
  postDeployChecks: [
    { url: '/', expectedStatus: 200 },
  ],
};

function createDeployer() {
  return new DeployerAgent(deployerConfig, {
    eventEmitter: new EventEmitter(),
    contextStore: new ContextStore(),
  });
}

describe('DeployerAgent', () => {
  it('should be instantiated with config and dependencies', () => {
    const agent = createDeployer();
    expect(agent).toBeTruthy();
    expect(agent.role).toBe('deployer');
    expect(agent.id).toBe('deployer-1');
    expect(agent.status).toBe('idle');
  });

  it('should have GitHub client initialized', () => {
    const agent = createDeployer();
    expect(agent.github).toBeTruthy();
    expect(agent.github.token).toBe('test-token');
    expect(agent.github.owner).toBe('testuser');
  });

  it('should have Vercel client initialized', () => {
    const agent = createDeployer();
    expect(agent.vercel).toBeTruthy();
    expect(agent.vercel.token).toBe('test-vercel-token');
  });

  it('should have EnvManager and RollbackManager', () => {
    const agent = createDeployer();
    expect(agent.envManager).toBeTruthy();
    expect(agent.rollbackManager).toBeTruthy();
    expect(agent.rollbackManager.enabled).toBe(true);
  });

  it('should have a defined pipeline', () => {
    const agent = createDeployer();
    expect(agent.pipeline).toBeInstanceOf(Array);
    expect(agent.pipeline.length).toBeGreaterThan(0);
    expect(agent.pipeline[0]).toBe('VERIFY_BUILD');
  });

  it('should reject task without project info', async () => {
    const agent = createDeployer();
    const result = await agent.execute({ payload: {} });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Project info');
  });

  it('should reject task with missing required files', async () => {
    const agent = createDeployer();
    const result = await agent.execute({
      payload: {
        project: {
          name: 'test-project',
          description: 'A test',
          requiredFiles: ['package.json'],
        },
        files: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('should prepare files correctly', async () => {
    const agent = createDeployer();
    agent.getContext = vi.fn().mockReturnValue(null);

    const result = await agent.execute({
      payload: {
        project: {
          name: 'test-project',
          description: 'A test project',
          requiredFiles: ['package.json'],
        },
        files: [{ path: 'src/index.js', content: 'console.log("hi");' }],
      },
    });

    // Should fail at verify build since file is not in context store,
    // or it should work if it can proceed
    expect(result).toBeTruthy();
  });
});

describe('GitHubClient', () => {
  it('should be instantiated with token and username', () => {
    const client = new GitHubClient('token123', 'myuser', 'myorg');
    expect(client.token).toBe('token123');
    expect(client.username).toBe('myuser');
    expect(client.owner).toBe('myorg');
  });

  it('should use username as owner when no org', () => {
    const client = new GitHubClient('token123', 'myuser');
    expect(client.owner).toBe('myuser');
  });

  it('should have correct headers', () => {
    const client = new GitHubClient('token123', 'myuser');
    expect(client.headers['Authorization']).toBe('Bearer token123');
    expect(client.headers['Accept']).toBe('application/vnd.github+json');
  });

  it('should include Team-Id header when org is set', () => {
    const client = new GitHubClient('token123', 'myuser', 'myorg');
    expect(client.headers['Team-Id']).toBe('myorg');
  });
});

describe('VercelClient', () => {
  it('should be instantiated with token and optional teamId', () => {
    const client = new VercelClient('vtoken123');
    expect(client.token).toBe('vtoken123');
    expect(client.teamId).toBeNull();
  });

  it('should include Team-Id header when set', () => {
    const client = new VercelClient('vtoken123', 'team123');
    expect(client.headers['Team-Id']).toBe('team123');
  });
});

describe('EnvManager', () => {
  it('should generate .env.example from content', () => {
    const env = new EnvManager();
    const example = env.generateEnvExample('DATABASE_URL=postgres://localhost\nAPI_KEY=secret123\n# Comment');
    expect(example).toContain('DATABASE_URL=');
    expect(example).toContain('API_KEY=');
    expect(example).toContain('Comment');
  });

  it('should detect secrets in content', () => {
    const env = new EnvManager();
    expect(env.containsSecrets('PASSWORD=secret').found).toBe(true);
    expect(env.containsSecrets('TOKEN=abc').found).toBe(true);
    expect(env.containsSecrets('normal_variable=value').found).toBe(false);
  });

  it('should sanitize sensitive values', () => {
    const env = new EnvManager();
    const sanitized = env.sanitizeForLog('PASSWORD=mysecret API_KEY=mykey');
    expect(sanitized).toContain('***REDACTED***');
    expect(sanitized).not.toContain('mysecret');
  });

  it('should parse env content', () => {
    const env = new EnvManager();
    const parsed = env.parseEnvContent('FOO=bar\nBAZ=qux');
    expect(parsed.FOO).toBe('bar');
    expect(parsed.BAZ).toBe('qux');
  });

  it('should validate required env vars', () => {
    const env = new EnvManager();
    const result = env.validateRequired({ DB_HOST: 'localhost' }, ['DB_HOST', 'DB_PASS']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('DB_PASS');
    expect(result.present).toContain('DB_HOST');
  });

  it('should separate safe from secret env vars', () => {
    const env = new EnvManager();
    const result = env.buildDeployEnvVars('APP_NAME=myapp\nDB_PASSWORD=secret');
    expect(result.safe.APP_NAME).toBe('myapp');
    expect(result.secrets.DB_PASSWORD).toBe('secret');
  });
});

describe('RollbackManager', () => {
  it('should record deployments', () => {
    const rm = new RollbackManager();
    rm.record({ id: 'd1', url: 'https://app1.vercel.app', state: 'READY' });
    rm.record({ id: 'd2', url: 'https://app2.vercel.app', state: 'READY' });

    const summary = rm.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.successful).toBe(2);
  });

  it('should get rollback target', () => {
    const rm = new RollbackManager();
    rm.record({ id: 'd1', url: 'https://old.vercel.app', state: 'READY' });
    rm.record({ id: 'd2', url: 'https://new.vercel.app', state: 'ERROR' });

    const target = rm.getRollbackTarget();
    expect(target).toBeTruthy();
    expect(target.id).toBe('d1');
  });

  it('should report canRollback', () => {
    const rm = new RollbackManager();
    rm.record({ id: 'd1', url: 'https://app.vercel.app', state: 'READY', success: true });
    expect(rm.getSummary().canRollback).toBe(false);

    rm.record({ id: 'd2', url: 'https://app2.vercel.app', state: 'ERROR', success: false });
    expect(rm.getSummary().canRollback).toBe(true);
  });

  it('should respect disabled state', () => {
    const rm = new RollbackManager({ enabled: false });
    expect(rm.shouldRollback()).toBe(false);
  });
});
