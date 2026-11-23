'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict');
const candidate = require(process.env.VPM_RIMRAF_PACKAGE || '../../packages/vrimraf');
const controls = ['rimraf', 'rimraf-app', 'rimraf-five'];
function fixture() {
  const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrimraf-contract-')));
  for (const file of [
    'out/a.txt',
    'out/nested/b.js',
    'out/nested/keep.txt',
    'outside/sentinel',
    'file*',
    'literal',
    'out-peer/c',
  ]) {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    fs.writeFileSync(path.join(cwd, file), 'data');
  }
  fs.symlinkSync(cwd + '/outside', cwd + '/linked');
  fs.symlinkSync(cwd + '/absent', cwd + '/broken');
  return cwd;
}
function inventory(cwd, p = '') {
  const result = [];
  for (const entry of fs
    .readdirSync(path.join(cwd, p), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(p, entry.name);
    result.push(name + (entry.isSymbolicLink() ? '@' : entry.isDirectory() ? '/' : ''));
    if (entry.isDirectory()) result.push(...inventory(cwd, name));
  }
  return result;
}
const cases = [
  { name: 'empty batch', targets: [] },
  { name: 'absent', targets: ['absent'] },
  { name: 'file', targets: ['literal'] },
  { name: 'directory', targets: ['out'] },
  { name: 'literal wildcard', targets: ['file*'] },
  { name: 'independent array', targets: ['out', 'literal'] },
  { name: 'symlinks', targets: ['linked', 'broken'] },
  { name: 'terminal link separator', targets: ['linked/'] },
  { name: 'all filter', targets: ['out'], filter: () => true },
  { name: 'reject file', targets: ['out'], filter: (p) => !p.endsWith('/keep.txt') },
  {
    name: 'reject directories after children',
    targets: ['out'],
    filter: (_p, e) => !e.isDirectory(),
  },
  { name: 'reject every entry', targets: ['out'], filter: () => false },
  {
    name: 'overlap with manual strategy',
    targets: ['out', 'out/nested', 'out/nested/b.js'],
    filter: () => true,
  },
  { name: 'glob cwd', targets: ['out/**/*.js'], glob: {} },
  { name: 'glob no match', targets: ['missing*'], glob: true },
  { name: 'glob ignore', targets: ['out/**/*'], glob: { ignore: '**/keep.txt', nodir: true } },
  { name: 'glob links', targets: ['link*', 'bro*'], glob: {} },
  { name: 'duplicates', targets: ['literal', 'literal'], filter: () => true },
  { name: 'signal traversal', targets: ['out'], signal: true },
];
async function execute(lib, test, sync) {
  const cwd = fixture();
  try {
    const options = {};
    if (test.filter) options.filter = sync ? test.filter : async (...args) => test.filter(...args);
    if (test.signal) options.signal = new AbortController().signal;
    const args =
      test.glob !== undefined ? test.targets : test.targets.map((p) => path.join(cwd, p));
    if (test.glob !== undefined) options.glob = { ...test.glob, cwd };
    const result = sync ? lib.rimrafSync(args, options) : await lib.rimraf(args, options);
    return { result, tree: inventory(cwd) };
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
}
(async () => {
  let checks = 0;
  for (const name of controls) {
    const control = require(name);
    for (const sync of [true, false])
      for (const test of cases) {
        assert.deepEqual(
          await execute(candidate, test, sync),
          await execute(control, test, sync),
          `${name} ${sync ? 'sync' : 'async'} ${test.name}`,
        );
        checks++;
      }
  }
  // Generated flat trees cover combinations of retained entries. A manual
  // filter avoids measuring the known overlapping native-rm race in Bun.
  for (let seed = 0; seed < 64; seed++) {
    const test = {
      name: 'retention mask ' + seed,
      targets: ['out', 'literal', 'file*'],
      filter: (p) =>
        ((seed >> [...path.basename(p)].reduce((n, c) => n + c.charCodeAt(0), 0) % 6) & 1) === 0,
    };
    for (const sync of [true, false]) {
      assert.deepEqual(
        await execute(candidate, test, sync),
        await execute(require('rimraf'), test, sync),
        test.name,
      );
      checks++;
    }
  }
  console.log(
    `${checks} sync/async filesystem comparisons against rimraf 6.1.4, app 6.1.3 and SDK 5.0.10 pass.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
