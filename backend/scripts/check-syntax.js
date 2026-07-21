const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const roots = ['src', 'scripts', 'tests'];
const files = [];

function collect(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) collect(path.join(relativePath, entry));
    return;
  }
  if (relativePath.endsWith('.js') || relativePath.endsWith('.cjs') || relativePath.endsWith('.mjs')) files.push(relativePath);
}

for (const root of roots) collect(root);

let failed = false;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout || `${file}: syntax check failed\n`);
  }
}

if (failed) process.exit(1);
console.log(`Syntax checked ${files.length} backend JavaScript files`);
