/**
 * Deploy Configuration
 * GitHub and Vercel deployment settings.
 */

export const DEPLOY_CONFIG = {
  github: {
    token: process.env.GITHUB_TOKEN || '',
    username: process.env.GITHUB_USERNAME || '',
    org: process.env.GITHUB_ORG || null,
    visibility: 'public',
    autoCreateRepo: true,
    branch: 'main',
    commitStyle: 'conventional',
  },

  vercel: {
    token: process.env.VERCEL_TOKEN || '',
    teamId: process.env.VERCEL_TEAM_ID || null,
    framework: 'auto-detect',
    buildCommand: 'auto',
    outputDirectory: 'auto',
    installCommand: 'auto',
    nodeVersion: '20.x',
    regions: ['bom1'],
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
    { url: '/health', expectedStatus: 200 },
  ],

  notifyOn: ['SUCCESS', 'FAILURE', 'ROLLBACK'],
};

export default DEPLOY_CONFIG;
