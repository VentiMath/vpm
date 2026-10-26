'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, compiler } = require('./platform-types.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-type-archives-'));
function run(command, args, cwd = directory) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout.slice(0, 8000)}\n${result.stderr.slice(0, 2000)}`);
  return result.stdout;
}
try {
  const dependencies = {};
  for (const name of ['vundici-types', 'vnode-types']) {
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', directory, '--quiet'], path.join(root, 'packages', name));
    const archive = fs.readdirSync(directory).find(file => file.startsWith(name + '-') && file.endsWith('.tgz'));
    assert.ok(archive, 'archive exists for ' + name);
    const packed = path.join(directory, archive);
    dependencies[name] = 'file:' + packed;
    const entries = run('tar', ['-tzf', packed]).trim().split('\n').map(file => file.replace(/^package\//, ''));
    for (const file of entries.filter(file => !file.endsWith('/'))) {
      assert.ok(file.endsWith('.d.ts') || ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'UPSTREAM.json'].includes(file), file);
    }
    for (const file of ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'UPSTREAM.json']) assert.ok(entries.includes(file), file);
    const metadata = JSON.parse(run('tar', ['-xOf', packed, 'package/package.json']));
    if (name === 'vnode-types') assert.equal(metadata.dependencies['vundici-types'], '0.1.0');
  }
  const source = `
import { createServer, WebSocket } from 'node:http';
import { Blob } from 'node:buffer';
import type * as U from 'vundici-types';
import type { RequestInit } from 'vundici-types/web';
declare const runtime: typeof U;
const init: RequestInit = { cache: 'no-store' };
const request = new Request('https://example.test', init);
const bytes: Promise<Uint8Array> = request.bytes();
const response = runtime.Response.redirect('https://example.test');
const form = new runtime.FormData();
form.append('file', new Blob(['data']), 'file.txt');
// @ts-expect-error a filename requires a Blob
form.set('file', 'data', 'file.txt');
const mock = new runtime.MockAgent();
mock.get('https://example.test').intercept({ path: '/' }).reply(200, 'ok');
createServer((req, res) => res.end(req.url));
const socket = new WebSocket('wss://example.test');
void [bytes, response, form, mock, socket];
`;
  fs.writeFileSync(path.join(directory, 'consumer.cts'), source);
  fs.writeFileSync(path.join(directory, 'consumer.mts'), source);
  fs.writeFileSync(path.join(directory, 'browser.mts'), `
import { createServer } from 'node:http';
import type { RequestInit } from 'vundici-types/web';
const init: RequestInit = { cache: 'reload' };
fetch('https://example.test', { cache: 'no-cache' });
const form = new FormData();
form.append('file', new File(['data'], 'file.txt'), 'file.txt');
const canvas: HTMLCanvasElement = document.createElement('canvas');
createServer((req, res) => res.end(req.method));
void [init, form, canvas];
`);
  fs.writeFileSync(path.join(directory, 'legacy-reference.cts'), '/// <reference types="node" />\nimport { Buffer } from "node:buffer";\nconst bytes: Buffer = Buffer.from("data");\n');
  function install() {
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'vpm-archive-consumer', private: true,
      devDependencies: dependencies,
    }));
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(directory, 'npm-cache')]);
  }
  function compile(dom, compatibility) {
    fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      strict: true, noEmit: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
      lib: ['ES2022', ...(dom ? ['DOM', 'DOM.Iterable'] : [])], types: [compatibility ? 'node' : 'vnode-types'], skipLibCheck: false,
      ...(compatibility ? { typeRoots: ['./node_modules/vnode-types/compat', './node_modules/@types'] } : {}),
    }, files: [...(dom ? ['browser.mts'] : ['consumer.cts', 'consumer.mts']), ...(compatibility ? ['legacy-reference.cts'] : [])] }));
    const tsc = compiler();
    const output = run(process.execPath, [tsc.path, '-p', path.join(directory, 'tsconfig.json'), '--listFiles', '--pretty', 'false']);
    assert.doesNotMatch(output, /\/packages\/v(?:node|undici)-types\//, 'must resolve installed archives, not workspace sources');
    assert.doesNotMatch(output, /\/node_modules\/undici-types\//);
    assert.doesNotMatch(output, /\/node_modules\/@types\/node\//);
    console.log(`Archives: TypeScript ${tsc.version}, ${dom ? 'DOM + Node' : 'CJS + ESM Node'}, ${compatibility ? 'legacy node references' : 'VPM names'} passed.`);
  }
  install();
  compile(false, false);
  compile(true, false);
  // Third-party declarations often explicitly reference "node". A small type
  // root redirects that reference to the existing VPM tree, without a second copy.
  compile(false, true);
  compile(true, true);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
