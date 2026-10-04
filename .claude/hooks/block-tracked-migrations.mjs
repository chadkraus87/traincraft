#!/usr/bin/env node
// PreToolUse(Edit|Write): supabase/migrations is append-only once committed.
// A migration that is not yet tracked by git is still a draft — editable.
// A tracked one may have been applied somewhere, so it is frozen: add a new file.
// ponytail: only covers Edit/Write. A `sed -i` through Bash still slips past;
// `npm run check:migrations` and CI remain the backstop.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { relative, resolve, isAbsolute } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let filePath;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  filePath = input?.tool_input?.file_path;
} catch (err) {
  // Cannot tell what is being edited. Surface it (exit 1 shows stderr to the
  // user) rather than blocking every edit or staying silent.
  console.error(`block-tracked-migrations: unreadable hook input: ${err.message}`);
  process.exit(1);
}

if (!filePath) process.exit(0);

const rel = relative(root, isAbsolute(filePath) ? filePath : resolve(root, filePath));
if (!/^supabase\/migrations\/[^/]+\.sql$/.test(rel)) process.exit(0);

const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', rel], {
  cwd: root,
  stdio: 'ignore',
}).status === 0;

if (tracked) {
  console.error(
    `Blocked: ${rel} is committed, and migrations are append-only (CLAUDE.md).\n` +
      `Add a new numbered migration in supabase/migrations/ instead, then run ` +
      `\`npm run check:migrations\` and \`npm run test:db\`.`
  );
  process.exit(2);
}

process.exit(0);
