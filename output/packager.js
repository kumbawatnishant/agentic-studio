/**
 * Packager
 * Packages a completed project into a deliverable format.
 * Creates tarball, zip, or Docker image as needed.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class Packager {
  constructor(config = {}) {
    this.format = config.format || 'tarball'; // tarball, zip, docker
    this.outputDir = config.outputDir || './packages';
  }

  /**
   * Package a project directory.
   */
  async package(projectDir, name) {
    await fs.mkdir(this.outputDir, { recursive: true });

    switch (this.format) {
      case 'tarball':
        return this._packageTarball(projectDir, name);
      case 'zip':
        return this._packageZip(projectDir, name);
      case 'docker':
        return this._packageDocker(projectDir, name);
      default:
        throw new Error(`Unknown package format: ${this.format}`);
    }
  }

  /**
   * Create a tarball package.
   */
  _packageTarball(projectDir, name) {
    const packagePath = path.join(this.outputDir, `${name}.tar.gz`);
    execSync(`tar -czf ${packagePath} -C ${path.dirname(projectDir)} ${path.basename(projectDir)}`, {
      encoding: 'utf-8',
    });
    return packagePath;
  }

  /**
   * Create a zip package.
   */
  _packageZip(projectDir, name) {
    const packagePath = path.join(this.outputDir, `${name}.zip`);
    execSync(`cd ${projectDir} && zip -r ${packagePath} .`, {
      encoding: 'utf-8',
    });
    return packagePath;
  }

  /**
   * Create a Docker image.
   */
  _packageDocker(projectDir, name) {
    const imageName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    execSync(`docker build -t ${imageName} ${projectDir}`, {
      encoding: 'utf-8',
    });
    return imageName;
  }
}

export default Packager;