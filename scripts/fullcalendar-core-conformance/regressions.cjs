'use strict';
// Each defect reproduced with the original @fullcalendar/core 7.1.3 (and the
// copy of requestJson that @fullcalendar/react 7.1.3 bundles), then checked in
// vfullcalendar-core.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const {spawnSync} = require('node:child_process');
const {compile} = require('../platform-types.cjs');
const original = path.join(__dirname, 'node_modules/@fullcalendar/core');
const vpm = path.resolve(__dirname, '../../packages/vfullcalendar-core');

(async () => {
  // 1. A JSON feed URL with a #fragment: the range parameters were appended
  // after the fragment, which fetch never sends, so the server got no range.
  const seen = [];
  const server = http.createServer((request, response) => { seen.push(request.url); response.end('[]'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/feed.php#calendar`;
  const params = {start: '2026-11-01', end: '2026-12-13'};
  try {
    for (const entry of [path.join(original, 'protected-api.js'), path.join(__dirname, 'node_modules/@fullcalendar/react/chunks/cb8ba596.js'), path.join(vpm, 'protected-api.js')]) {
      const mod = await import(entry);
      await (mod.requestJson ?? mod.e)('GET', url, params);
    }
  } finally {
    server.close();
  }
  assert.equal(seen[0], seen[1], 'the two upstream copies agree');
  assert.ok(['/feed.php', '/feed.php#calendar?start=2026-11-01&end=2026-12-13'].includes(seen[0]), JSON.stringify(seen));
  assert.equal(seen[2], '/feed.php?start=2026-11-01&end=2026-12-13');

  // 2. The declarations name the DOM's Response, so a project without DOM or
  // Node types (a worker, or a server build with "types": []) cannot compile
  // an import of them. Here Response is the runtime's when it has one.
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-core-types-'));
  const typed = {};
  try {
    for (const [name, root] of [['upstream', original], ['vpm', vpm]]) {
      const file = path.join(consumer, name + '.ts');
      fs.writeFileSync(file, `import {requestJson, JsonRequestError} from ${JSON.stringify(path.join(root, 'protected-api.js'))};\n` +
        'export async function load(): Promise<number> { try { const [events] = await requestJson<unknown[]>("GET", "/feed", {}); return events.length; } catch (error) { return error instanceof JsonRequestError && error.response.ok ? 0 : -1; } }\n');
      for (const lib of [['ES2022'], ['ES2022', 'DOM']]) {
        const result = compile({files: [file], compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib, types: [], module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false}});
        typed[name + (lib.length > 1 ? '+dom' : '')] = result.diagnostics;
      }
    }
  } finally {
    fs.rmSync(consumer, {recursive: true, force: true});
  }
  assert.ok(typed.upstream.includes(2304), JSON.stringify(typed));
  assert.deepEqual([typed['upstream+dom'], typed.vpm, typed['vpm+dom']], [[], [], []]);

  // 3. Importing the package entry wrote a message to the console, although it
  // declares sideEffects: false (bundlers drop the import, Node and Bun print).
  const printed = {};
  for (const [name, root] of [['upstream', original], ['vpm', vpm]]) {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(path.join(root, 'index.js'))});`], {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr);
    printed[name] = run.stdout + run.stderr;
  }
  assert.match(printed.upstream, /@fullcalendar\/core should not be imported directly/);
  assert.equal(printed.vpm, '');

  console.log('Reproduced and fixed: a #fragment feed URL sent without its range parameters (in core and in the copy @fullcalendar/react bundles), declarations that need DOM types, and a console message on import.');
})().catch(error => { console.error(error); process.exit(1); });
