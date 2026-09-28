/**
 * Vercel Client
 * Handles deployments, environment variables, and project settings.
 */

export class VercelClient {
  constructor(token, teamId = null) {
    this.token = token;
    this.teamId = teamId;
    this.baseUrl = 'https://api.vercel.com';
  }

  get headers() {
    const h = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
    if (this.teamId) {
      h['Team-Id'] = this.teamId;
    }
    return h;
  }

  /**
   * Create a new deployment.
   */
  async createDeployment(projectName, files, settings = {}) {
    const deploymentFiles = (files || []).map(f => ({
      file: f.path,
      data: typeof f.content === 'string' ? Buffer.from(f.content).toString('base64') : f.content,
      encoding: 'base64',
    }));

    const body = {
      name: projectName,
      files: deploymentFiles,
      projectSettings: {
        framework: settings.framework || 'auto-detect',
        buildCommand: settings.buildCommand || 'auto',
        outputDirectory: settings.outputDirectory || 'auto',
        installCommand: settings.installCommand || 'auto',
        nodeVersion: settings.nodeVersion || '20.x',
      },
      env: settings.env || {},
      target: 'production',
      regions: settings.regions || ['bom1'],
    };

    const res = await this._request('/v9/deployments', {
      method: 'POST',
      body,
    });

    return {
      id: res.data?.id,
      url: res.data?.url,
      state: res.data?.state || 'PENDING',
      ready: res.data?.ready || false,
    };
  }

  /**
   * Wait for a deployment to complete.
   */
  async waitForDeployment(deploymentId, timeoutMs = 120000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const status = await this.getDeploymentStatus(deploymentId);

      if (status.state === 'READY') {
        return { ...status, ready: true };
      }
      if (status.state === 'ERROR') {
        return { ...status, ready: false, error: 'Deployment failed' };
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    return { state: 'TIMEOUT', ready: false, error: 'Deployment timed out' };
  }

  /**
   * Get deployment status.
   */
  async getDeploymentStatus(deploymentId) {
    const res = await this._request(`/v9/deployments/${deploymentId}`, { method: 'GET' });
    return {
      id: res.data?.id,
      url: res.data?.url,
      state: res.data?.state,
      ready: res.data?.ready,
      buildLogs: res.data?.buildLogs,
    };
  }

  /**
   * Set environment variables for a project.
   */
  async setEnvVars(projectId, envVars) {
    const entries = Object.entries(envVars);
    for (const [key, value] of entries) {
      await this._request(`/v9/projects/${projectId}/env`, {
        method: 'POST',
        body: { key, value, target: ['production'] },
      });
    }
    return { set: entries.length };
  }

  /**
   * Get project by name.
   */
  async getProject(projectName) {
    const params = new URLSearchParams({ name: projectName });
    if (this.teamId) params.set('teamId', this.teamId);

    const res = await this._request(`/v9/projects?${params}`, { method: 'GET' });
    return res.data?.projects?.[0] || null;
  }

  /**
   * Get deployment logs.
   */
  async getDeploymentLogs(deploymentId) {
    const res = await this._request(`/v10/deployments/${deploymentId}/logs`, { method: 'GET' });
    return res.data || {};
  }

  /**
   * Rollback to a previous deployment.
   */
  async rollback(deploymentId) {
    const res = await this._request(`/v9/deployments/${deploymentId}/rollback`, {
      method: 'POST',
    });
    return {
      rollbackId: res.data?.id,
      url: res.data?.url,
      state: res.data?.state,
    };
  }

  /**
   * Make an HTTP request to the Vercel API.
   */
  async _request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : undefined;

    const res = await fetch(url, {
      method,
      headers: this.headers,
      body,
    });

    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(`Vercel API error ${res.status}: ${text?.slice(0, 200)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return { status: res.status, data, headers: res.headers };
  }
}

export default VercelClient;
