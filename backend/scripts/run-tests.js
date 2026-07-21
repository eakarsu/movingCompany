const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDatabaseUrl = String(process.env.TEST_DATABASE_URL || '').trim();
if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is required');
  process.exit(1);
}

let databaseName;
try {
  const parsed = new URL(testDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('not PostgreSQL');
  databaseName = parsed.pathname.replace(/^\//, '');
} catch {
  console.error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  process.exit(1);
}

if (!/(^|_)test$/.test(databaseName) || process.env.RESET_TEST_DATABASE !== 'true') {
  console.error('Test reset refused: database name must end in _test and RESET_TEST_DATABASE=true is required');
  process.exit(1);
}

const environment = { ...process.env, DATABASE_URL: testDatabaseUrl, NODE_ENV: 'test' };

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env: environment, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed']);
const tests = fs.readdirSync(path.resolve(process.cwd(), 'tests'))
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join('tests', file));
if (tests.length === 0) {
  console.error('No test files found');
  process.exit(1);
}
run(process.execPath, ['--test', '--test-concurrency=1', ...tests]);
