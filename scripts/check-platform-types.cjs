'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { root, modules, configuration, runtimeTypeTests, compiler } = require('./platform-types.cjs');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-platform-types-'));
const write = (name, text) => { const file = path.join(temporary, name); fs.writeFileSync(file, text); return file; };
function compile(files, options) {
  const config = ts.parseJsonConfigFileContent(configuration(files, options), ts.sys, root);
  const program = ts.createProgram(config.fileNames, config.options);
  return { program, diagnostics: ts.getPreEmitDiagnostics(program) };
}
function clean(result) {
  assert.equal(result.diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
}
async function run() {
  const common = write('common.cts', `
import { createServer, WebSocket as HttpWebSocket } from 'node:http';
import { Blob, Buffer } from 'node:buffer';
import type * as U from 'vundici-types';
declare const runtime: typeof U;
const request: U.Request = new runtime.Request('https://example.test', { method: 'POST', body: new Blob(['data']) });
const response: U.Response = runtime.Response.redirect('https://example.test', 302);
const headers: U.Headers = new runtime.Headers({ accept: 'text/plain' });
const agent: U.Dispatcher = new runtime.Agent({ connections: 2 });
const pool = new runtime.Pool('https://example.test');
const mock = new runtime.MockAgent();
mock.get('https://example.test').intercept({ path: '/' }).reply(200, 'ok');
const server = createServer((req, res) => res.end(Buffer.from(req.url || '')));
const socket = new HttpWebSocket('wss://example.test');
void [request, response, headers, agent, pool, mock, server, socket];
`);
  const dom = write('dom.mts', `
import type { RequestInit as UndiciInit } from 'vundici-types/web';
import { createServer } from 'node:http';
import { Blob } from 'node:buffer';
const init: RequestInit = { cache: 'no-store', headers: new Headers() };
fetch('https://example.test', init).then(response => response.text());
const undiciInit: UndiciInit = { cache: 'reload', body: new Blob(['data']) };
const form = new FormData();
form.append('file', new File(['data'], 'file.txt'), 'file.txt');
// @ts-expect-error DOM FormData remains strict about filenames
form.append('file', 'text', 'file.txt');
const canvas: HTMLCanvasElement = document.createElement('canvas');
createServer((req, res) => res.end(req.method));
void [undiciInit, canvas];
`);
  const fixes = write('fixes.cts', `
import type * as U from 'vundici-types';
declare const runtime: typeof U;
const request = new runtime.Request('https://example.test', { cache: 'no-store' });
const requestBytes: Promise<Uint8Array> = request.bytes();
const response = runtime.Response.redirect('https://example.test');
const responseBytes: Promise<Uint8Array> = response.bytes();
const form = new runtime.FormData();
// @ts-expect-error filenames require a Blob value
form.append('x', 'text', 'x.txt');
// @ts-expect-error explicit undefined is still a third argument
form.set('x', 42, undefined);
void [requestBytes, responseBytes];
`);
  clean(compile([common], { baseline: true }));
  clean(compile([common, fixes]));
  const failures = compile([fixes], { baseline: true }).diagnostics;
  assert.equal(failures.length, 6, 'the upstream fixture must reproduce all six regression assertions');
  assert.deepEqual(failures.map(d => d.code).sort(), [2339, 2339, 2353, 2554, 2578, 2578]);

  // Compare the same consumers on the same compiler and standard library.
  const runtimeFiles = runtimeTypeTests();
  const before = compile(runtimeFiles, { baseline: true });
  const after = compile(runtimeFiles);
  clean(before); clean(after);
  const upstreamFiles = before.program.getSourceFiles().filter(f => /\/undici-types\//.test(f.fileName));
  const vpmFiles = after.program.getSourceFiles().filter(f => /\/vundici-types\//.test(f.fileName));
  assert.ok(vpmFiles.length < upstreamFiles.length);
  for (const file of after.program.getSourceFiles()) {
    assert.doesNotMatch(file.fileName, /\/undici-types\/|\/node_modules\/(?:\.bun\/[^/]+\/node_modules\/)?@types\/node\//);
  }
  assert.ok(!vpmFiles.some(f => /^(mock-|pool|agent|index)/.test(path.basename(f.fileName))));
  console.log(`Node consumer closure: ${upstreamFiles.length} upstream Undici files → ${vpmFiles.length} VPM files; no upstream Node/Undici declarations loaded.`);

  // Exercise the minimum, workspace, and current compilers in fresh processes.
  // Strictly check declarations in both Node-only and DOM projects, in CJS/ESM.
  for (const name of ['typescript-min', 'typescript', 'typescript-current']) {
    const tsc = compiler(name);
    for (const browser of [false, true]) {
      const files = browser ? [common, fixes, dom] : [common, fixes, ...runtimeFiles,
        path.join(root, 'packages/vnode-types/test/types.ts'), path.join(root, 'packages/vundici-types/test/types.ts')];
      const config = write('tsconfig.json', JSON.stringify(configuration(files, { dom: browser })));
      const result = spawnSync(process.execPath, [tsc.path, '-p', config, '--pretty', 'false'], { encoding: 'utf8', cwd: root });
      assert.equal(result.status, 0, `${tsc.version} ${browser ? 'DOM' : 'Node'}\n${result.stdout}\n${result.stderr}`);
      console.log(`TypeScript ${tsc.version}: ${browser ? 'DOM + Node' : 'Node-only'} contracts passed.`);
    }
  }

  // Check the exact upstream runtime as well as the native-runtime unit tests.
  const undici = require(path.join(modules, 'undici'));
  const { Blob } = require('node:buffer');
  const request = new undici.Request('https://example.test', { cache: 'no-store', method: 'POST', body: 'data' });
  assert.equal(request.cache, 'no-store');
  assert.deepEqual([...await request.bytes()], [...Buffer.from('data')]);
  assert.deepEqual([...await new undici.Response('data').bytes()], [...Buffer.from('data')]);
  assert.equal(undici.Response.redirect('https://example.test').status, 302);
  for (const method of ['append', 'set']) {
    const form = new undici.FormData();
    form[method]('file', new Blob(['data']), 'file.txt');
    assert.equal(form.get('file').name, 'file.txt');
    assert.throws(() => form[method]('file', 'data', 'file.txt'), TypeError);
    assert.throws(() => form[method]('file', 'data', undefined), TypeError);
  }
  console.log('Pinned Undici 6.21.3 runtime confirms the corrected declarations.');
}
run().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
