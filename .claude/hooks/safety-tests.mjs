#!/usr/bin/env node
// PostToolUse(Edit|Write): the contraindication filter and the QA validator are
// safety features (CLAUDE.md rule 1). Any edit under src/lib/safety or
// src/lib/ai re-runs the unit suite immediately; a failure exits 2 so the
// output goes back to Claude to fix rather than waiting for CI.
// Note: tests/coverage.test.ts (rule-tag coverage) needs Postgres and lives in
// `npm run test:db` — too slow for an edit hook, still enforced in CI.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { relative, resolve, isAbsolute } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let filePath;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  filePath = input?.tool_input?.file_path;
} catch (err) {
  console.error(`safety-tests: unreadable hook input: ${err.message}`);
  process.exit(1);
}

if (!filePath) process.exit(0);

const rel = relative(root, isAbsolute(filePath) ? filePath : resolve(root, filePath));
if (!/^src\/lib\/(safety|ai)\//.test(rel)) process.exit(0);

const run = spawnSync('npm', ['test'], { cwd: root, encoding: 'utf8' });

if (run.status !== 0) {
  const output = `${run.stdout || ''}${run.stderr || ''}`.trimEnd();
  console.error(
    `\`npm test\` failed after editing ${rel}. The safety pipeline is not allowed ` +
      `to regress — fix this before continuing.\n\n${output.slice(-6000)}`
  );
  process.exit(2);
}

process.exit(0);
