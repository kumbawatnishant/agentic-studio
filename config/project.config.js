/**
 * Project Configuration
 * Defines project structure, tech stack, and build settings.
 */

export const PROJECT_CONFIG = {
  name: 'my-project',
  version: '1.0.0',
  description: 'A project built with Agentic Studio',

  techStack: [
    'Node.js',
    'Next.js 14',
    'React 18',
    'TypeScript',
    'Tailwind CSS',
    'PostgreSQL',
  ],

  structure: {
    directories: [
      'src',
      'src/app',
      'src/components',
      'src/lib',
      'tests',
      'docs',
      'deploy',
    ],
    files: [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'tailwind.config.js',
      'README.md',
      '.gitignore',
      '.env.example',
    ],
  },

  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
    test: 'vitest run',
    'test:e2e': 'playwright test',
  },

  requiredFiles: [
    'package.json',
    'README.md',
    '.gitignore',
  ],
};

export default PROJECT_CONFIG;