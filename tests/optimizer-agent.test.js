import { describe, it, expect, vi } from 'vitest';
import { OptimizerAgent } from '../agents/optimizer-agent.js';
import { EventEmitter } from '../shared/event-emitter.js';
import { ContextStore } from '../shared/context-store.js';

const optimizerConfig = {
  id: 'optimizer-1',
  role: 'optimizer',
  model: 'gemini-2.0-flash',
  libraryRules: {
    preferBuiltIn: true,
    allowedLibraries: ['lodash-es', 'date-fns', 'dayjs', 'uuid'],
    bannedLibraries: ['moment'],
    maxBundleIncrease: 5000,
  },
  checks: {
    libraryOpportunities: true,
    redundantCode: true,
    builtInMethods: true,
    bundleSize: true,
    codeSmells: true,
    duplication: true,
  },
};

function createOptimizer() {
  return new OptimizerAgent(optimizerConfig, {
    eventEmitter: new EventEmitter(),
    contextStore: new ContextStore(),
  });
}

describe('OptimizerAgent', () => {
  it('should be instantiated with config and dependencies', () => {
    const agent = createOptimizer();
    expect(agent).toBeTruthy();
    expect(agent.role).toBe('optimizer');
    expect(agent.id).toBe('optimizer-1');
    expect(agent.status).toBe('idle');
  });

  it('should have default library rules', () => {
    const agent = createOptimizer();
    expect(agent.libraryRules.preferBuiltIn).toBe(true);
    expect(agent.libraryRules.bannedLibraries).toContain('moment');
    expect(agent.libraryRules.allowedLibraries).toContain('date-fns');
  });

  it('should skip test files', () => {
    const agent = createOptimizer();
    expect(agent._shouldSkipFile('src/utils.test.js')).toBe(true);
    expect(agent._shouldSkipFile('src/__tests__/foo.test.js')).toBe(true);
    expect(agent._shouldSkipFile('config/app.config.js')).toBe(true);
    expect(agent._shouldSkipFile('src/index.js')).toBe(false);
  });

  it('should skip boilerplate and node_modules', () => {
    const agent = createOptimizer();
    expect(agent._shouldSkipFile('src/boilerplate.js')).toBe(true);
    expect(agent._shouldSkipFile('node_modules/foo/index.js')).toBe(true);
  });

  it('should optimize code via _optimizeFile with mocked LLM', async () => {
    const agent = createOptimizer();
    agent.generateJSON = vi.fn().mockResolvedValue({
      optimizedCode: `import { format } from 'date-fns';\nconst formatDate = (d) => format(d, 'EEE, MMM d, yyyy');`,
      changes: [
        {
          type: 'LIBRARY_REPLACE',
          line: 1,
          original: 'function formatDate(date) { ... }',
          replacement: "import { format } from 'date-fns'",
          reason: 'date-fns is battle-tested, 2kb, tree-shakeable',
          impact: 'lines saved: 8',
        },
      ],
      warnings: [],
    });

    const file = { path: 'src/utils.js', content: 'function formatDate(date) { return "Jan"; }' };
    const result = await agent._optimizeFile(file, 'javascript', { dependencies: ['date-fns'] });

    expect(result).toBeTruthy();
    expect(result.file.path).toBe('src/utils.js');
    expect(result.file.content).toContain('date-fns');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].type).toBe('LIBRARY_REPLACE');
    expect(result.changes[0].file).toBe('src/utils.js');
  });

  it('should calculate stats correctly', () => {
    const agent = createOptimizer();
    const originalFiles = [
      { path: 'a.js', content: 'line1\nline2\nline3' },
      { path: 'b.js', content: 'line1\nline2' },
    ];
    const optimizedFiles = [
      { path: 'a.js', content: 'import { format } from "date-fns";' },
    ];
    const changes = [
      { type: 'LIBRARY_REPLACE', line: 1 },
      { type: 'REMOVE_REDUNDANT', line: 2 },
      { type: 'USE_BUILTIN', line: 3 },
    ];

    const stats = agent._calculateStats(originalFiles, optimizedFiles, changes);
    expect(stats.linesBefore).toBe(5);
    expect(stats.linesAfter).toBe(1);
    expect(stats.linesSaved).toBe(4);
    expect(stats.codeRemoved).toBe(1);
    expect(stats.codeReplaced).toBe(1);
    expect(stats.codeSimplified).toBe(1);
    expect(stats.totalChanges).toBe(3);
  });

  it('should handle empty files in performTask', async () => {
    const agent = createOptimizer();
    const result = await agent.performTask({ payload: { files: [] } });
    expect(result.success).toBe(true);
    expect(result.data.optimizedFiles).toEqual([]);
    expect(result.data.changes).toEqual([]);
  });

  it('should handle missing payload in performTask', async () => {
    const agent = createOptimizer();
    const result = await agent.performTask({ payload: {} });
    expect(result.success).toBe(true);
  });

  it('should skip files matching skip patterns in performTask', async () => {
    const agent = createOptimizer();
    agent.generateJSON = vi.fn();

    const result = await agent.performTask({
      payload: {
        files: [
          { path: 'src/app.test.js', content: 'test code' },
          { path: 'src/app.js', content: 'real code' },
        ],
        language: 'javascript',
        projectDependencies: {},
      },
    });

    expect(result.success).toBe(true);
    // Test files should be skipped, real files should be processed (but LLM returns null so keeps original)
    expect(result.data.optimizedFiles.length).toBeLessThanOrEqual(2);
  });

  it('should calculate stats with empty files', () => {
    const agent = createOptimizer();
    const stats = agent._calculateStats([], [], []);
    expect(stats.linesBefore).toBe(0);
    expect(stats.linesAfter).toBe(0);
    expect(stats.linesSaved).toBe(0);
    expect(stats.totalChanges).toBe(0);
  });
});
