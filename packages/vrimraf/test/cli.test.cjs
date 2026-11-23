'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { spawnSync } = require('node:child_process');
// Bun consumes the first post-script --; retain a separate application separator.
const bin = path.resolve(__dirname, '../bin.cjs');
test('CLI supports literal paths, opt-in globs, separators and information-only requests', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vrimraf-cli-'));
  const run = (args) =>
    spawnSync(process.execPath, [bin, ...(process.versions.bun ? ['--'] : []), ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 10000,
    });
  try {
    for (const name of ['file*', 'file.txt', '-dash', 'a.tmp', 'b.tmp'])
      fs.writeFileSync(path.join(cwd, name), 'x');
    assert.equal(run(['--version', 'file.txt']).stdout.trim(), '6.1.4');
    assert(fs.existsSync(cwd + '/file.txt'));
    assert.equal(run(['--help']).status, 0);
    assert.notEqual(run([]).status, 0);
    assert.equal(run(['file*']).status, 0);
    assert(fs.existsSync(cwd + '/file.txt'));
    assert(!fs.existsSync(cwd + '/file*'));
    assert.equal(run(['--', '-dash']).status, 0);
    assert(!fs.existsSync(cwd + '/-dash'));
    assert.equal(run(['--glob', '*.tmp']).status, 0);
    assert(!fs.existsSync(cwd + '/a.tmp'));
    assert(!fs.existsSync(cwd + '/b.tmp'));
    assert.notEqual(run(['file.txt', '--no-preserve-root']).status, 0);
    assert(fs.existsSync(cwd + '/file.txt'));
    assert.notEqual(run(['file.txt', '--max-retries=-1']).status, 0);
    assert(fs.existsSync(cwd + '/file.txt'));
    const verbose = run(['--verbose', '--max-retries=2', '--retry-delay=1', 'file.txt']);
    assert.equal(verbose.status, 0);
    assert.match(verbose.stdout, /file\.txt/);
    assert(!fs.existsSync(cwd + '/file.txt'));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
