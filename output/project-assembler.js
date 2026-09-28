/**
 * Project Assembler
 * Takes all agent outputs and builds the final project structure.
 * Validates completeness and packages the deliverable.
 */

import { promises as fs } from 'fs';
import path from 'path';

export class ProjectAssembler {
  constructor(config = {}) {
    this.outputDir = config.outputDir || './output';
    this.contextStore = config.contextStore;
    this.validator = config.validator;
  }

  /**
   * Assemble the project from context store and agent outputs.
   */
  async assemble(projectConfig) {
    const { name, description, techStack, structure } = projectConfig;

    console.log(`[Assembler] Building project: ${name}`);

    // 1. Create project directory
    const projectDir = path.join(this.outputDir, name);
    await fs.mkdir(projectDir, { recursive: true });

    // 2. Write all files from context store
    const files = this._getProjectFiles();
    const writtenFiles = [];

    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
      writtenFiles.push(file.path);
    }

    // 3. Write project config
    await this._writeProjectConfig(projectDir, projectConfig);

    // 4. Validate
    const validation = this.validator
      ? await this.validator.validate(projectDir, projectConfig)
      : { valid: true, issues: [] };

    // 5. Package
    const packagePath = await this.package(projectDir, name);

    return {
      projectDir,
      files: writtenFiles,
      validation,
      packagePath,
    };
  }

  /**
   * Get all project files from context store.
   */
  _getProjectFiles() {
    if (!this.contextStore) return [];

    const keys = this.contextStore.list('file:');
    const files = [];

    for (const key of keys) {
      const entry = this.contextStore.get(key);
      if (entry && entry.value) {
        const relativePath = key.replace('file:', '');
        files.push({
          path: relativePath,
          content: typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2),
        });
      }
    }

    return files;
  }

  /**
   * Write project configuration files.
   */
  async _writeProjectConfig(projectDir, config) {
    const packageJson = {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description,
      type: 'module',
      scripts: config.scripts || {},
      dependencies: config.dependencies || {},
      devDependencies: config.devDependencies || {},
    };

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Write README
    const readme = `# ${config.name}\n\n${config.description || ''}\n\n## Tech Stack\n${(config.techStack || []).map(t => `- ${t}`).join('\n')}\n`;
    await fs.writeFile(path.join(projectDir, 'README.md'), readme);
  }

  /**
   * Package the project into a tarball.
   */
  async package(projectDir, name) {
    const packagePath = `${this.outputDir}/${name}.tar.gz`;
    // Use tar command
    const { execSync } = await import('child_process');
    try {
      execSync(`tar -czf ${packagePath} -C ${this.outputDir} ${name}`);
      return packagePath;
    } catch (err) {
      console.error('[Assembler] Packaging failed:', err.message);
      return null;
    }
  }
}

export default ProjectAssembler;