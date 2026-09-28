/**
 * GitHub Client
 * Handles repository creation, commits, and pushes.
 */

export class GitHubClient {
  constructor(token, username, org = null) {
    this.token = token;
    this.username = username;
    this.org = org;
    this.baseUrl = 'https://api.github.com';
  }

  get headers() {
    const h = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': this.username,
    };
    if (this.org) {
      h['X-GitHub-Api-Version'] = '2022-11-28';
      h['Team-Id'] = this.org;
    }
    return h;
  }

  /**
   * Get the owner name (org or user).
   */
  get owner() {
    return this.org || this.username;
  }

  /**
   * Check if a repository already exists.
   */
  async repoExists(repoName) {
    try {
      const res = await this._request(`/repos/${this.owner}/${repoName}`, { method: 'GET' });
      return { exists: true, url: res.data?.html_url || res.clone_url, created: false };
    } catch (err) {
      if (err.status === 404) {
        return { exists: false, url: null, created: false };
      }
      throw err;
    }
  }

  /**
   * Create a new repository.
   */
  async createRepo(name, description, visibility = 'public') {
    const existing = await this.repoExists(name);
    if (existing.exists) {
      return { repoUrl: existing.url, cloneUrl: existing.url + '.git', created: false };
    }

    const res = await this._request('/user/repos', {
      method: 'POST',
      body: {
        name,
        description: description || `Built with Agentic Studio`,
        private: visibility === 'private',
        auto_init: false,
        gitignore_template: 'Node',
        license_template: 'MIT',
      },
    });

    return {
      repoUrl: res.data?.html_url,
      cloneUrl: res.data?.clone_url,
      created: true,
    };
  }

  /**
   * Get the SHA of the main branch.
   */
  async getMainSha(repoName) {
    const res = await this._request(`/repos/${this.owner}/${repoName}/git/ref/heads/main`, {
      method: 'GET',
    });
    return res.data?.object?.sha || res.data?.sha;
  }

  /**
   * Create a git tree from file blobs.
   */
  async createTree(repoName, fileBlobs) {
    const tree = fileBlobs.map(f => ({
      path: f.path,
      mode: '100644',
      type: 'blob',
      content: f.content,
    }));

    const res = await this._request(`/repos/${this.owner}/${repoName}/git/trees`, {
      method: 'POST',
      body: { tree },
    });

    return res.data?.sha;
  }

  /**
   * Create a commit.
   */
  async createCommit(repoName, message, treeSha, parentShas) {
    const res = await this._request(`/repos/${this.owner}/${repoName}/git/commits`, {
      method: 'POST',
      body: {
        message,
        tree: treeSha,
        parents: parentShas,
      },
    });

    return res.data?.sha;
  }

  /**
   * Update a ref to point to a new commit SHA.
   */
  async updateRef(repoName, commitSha) {
    await this._request(`/repos/${this.owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      body: { sha: commitSha },
    });
  }

  /**
   * Push files to a repository as multiple meaningful commits.
   */
  async commitAndPush(repoName, files, commitStyle = 'conventional') {
    const owner = this.owner;
    const mainSha = await this.getMainSha(repoName);

    const commitGroups = this._groupFilesForCommits(files);
    let parentSha = mainSha;
    const commitResults = [];

    for (const group of commitGroups) {
      const treeSha = await this.createTree(repoName, group.files);
      const commitSha = await this.createCommit(repoName, group.message, treeSha, [parentSha]);
      await this.updateRef(repoName, commitSha);
      commitResults.push({ message: group.message, sha: commitSha, fileCount: group.files.length });
      parentSha = commitSha;
    }

    return { pushed: true, commitCount: commitResults.length, commits: commitResults };
  }

  /**
   * Group files into logical commit batches.
   */
  _groupFilesForCommits(files) {
    const groups = [
      {
        message: 'chore: initial project setup and configuration',
        filter: f => /config|package\.json|\.env\.example|\.gitignore/i.test(f.path),
      },
      {
        message: 'feat: core application source code',
        filter: f => f.path.startsWith('src/') || f.path.startsWith('lib/'),
      },
      {
        message: 'test: add test suite',
        filter: f => /test|spec/i.test(f.path),
      },
      {
        message: 'docs: add documentation',
        filter: f => /README|docs\//i.test(f.path),
      },
      {
        message: 'deploy: deployment configuration',
        filter: f => /deploy|\.vercel|\.render/i.test(f.path),
      },
    ];

    return groups
      .map(g => ({
        message: g.message,
        files: (files || []).filter(f => g.filter(f)),
      }))
      .filter(g => g.files.length > 0);
  }

  /**
   * Set repository settings (default branch, etc.).
   */
  async setRepoSettings(repoName, defaultBranch = 'main') {
    await this._request(`/repos/${this.owner}/${repoName}`, {
      method: 'PATCH',
      body: { default_branch: defaultBranch },
    });
  }

  /**
   * Make an HTTP request to the GitHub API.
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
      const err = new Error(`GitHub API error ${res.status}: ${text?.slice(0, 200)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return { status: res.status, data, headers: res.headers };
  }
}

export default GitHubClient;
