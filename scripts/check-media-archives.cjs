'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, compiler } = require('./platform-types.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-media-archives-'));
function run(command, args, cwd = directory) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout.slice(0, 8000)}\n${result.stderr.slice(0, 2000)}`);
  return result.stdout;
}
try {
  const dependencies = {};
  for (const name of ['vmedia-typer', 'vtype-is', 'vnegotiator', 'vaccepts', 'vcontent-type', 'vmime-types', 'vmime-db']) {
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', directory, '--quiet'], path.join(root, 'packages', name));
    const archive = fs.readdirSync(directory).find(file => file.startsWith(name + '-') && file.endsWith('.tgz'));
    assert.ok(archive, name);
    const packed = path.join(directory, archive);
    dependencies[name] = 'file:' + packed;
    const metadata = JSON.parse(run('tar', ['-xOf', packed, 'package/package.json']));
    for (const version of Object.values(metadata.dependencies || {})) assert.equal(version, '0.1.0');
    if (['vmedia-typer', 'vtype-is', 'vnegotiator', 'vaccepts'].includes(name)) {
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
  }
  fs.writeFileSync(path.join(directory, 'consumer.cjs'), `
const assert = require('node:assert/strict');
const media = require('vmedia-typer');
const typeis = require('vtype-is');
assert.equal(media.format(media.parse('application/foo+bar+json')), 'application/foo+bar+json');
assert.equal(media.test('text/K'), false);
assert.equal(typeis({ headers: { 'content-length': '0', 'content-type': 'TEXT/HTML' } }, ['HTML']), 'HTML');
assert.equal(typeis.is('application/problem+json', ['+JSON']), 'application/problem+json');
assert.equal(typeis.hasBody({ headers: { 'content-length': '-1' } }), false);
const Negotiator = require('vnegotiator');
const Accepts = require('vaccepts');
const request = { headers: { accept: 'text/html;q=2, application/json;q=0.5' } };
assert.equal(new Negotiator(request).mediaType(['text/html', 'application/json']), 'application/json');
assert.equal(Accepts(request).types('html', 'json'), 'json');
`);
  fs.writeFileSync(path.join(directory, 'consumer.mjs'), `
import assert from 'node:assert/strict';
import media, { parse, format, test } from 'vmedia-typer';
import typeis, { is, match, hasBody, normalize } from 'vtype-is';
assert.equal(media.parse, parse); assert.equal(typeis.is, is);
assert.equal(format(parse('text/x+')), 'text/x+'); assert.equal(test('text/html'), true);
assert.equal(match('TEXT/*', 'text/html'), true); assert.equal(normalize('json'), 'application/json');
assert.equal(hasBody({ headers: { 'content-length': '0' } }), true);
import Negotiator, { Negotiator as NamedNegotiator } from 'vnegotiator';
import Accepts from 'vaccepts';
assert.equal(Negotiator, NamedNegotiator);
assert.equal(Negotiator({ headers: {} }).mediaType(['text/html']), 'text/html');
assert.equal(new Accepts({ headers: {} }).types('html'), 'html');
`);
  const source = `
import media, { parse, format, test, type MediaType } from 'vmedia-typer';
import typeis, { is, match, hasBody, normalize } from 'vtype-is';
const parsed: MediaType = parse('text/html');
const header: string = format(parsed);
const result: string | false | null = typeis({ headers: { 'content-length': '0', 'content-type': header } }, ['html'] as const);
const matched: boolean = match('text/*', header);
const normalized: string | false = normalize('html');
is(header, 'html', 'json'); hasBody({ headers: {} }); test(media.format(parsed));
// @ts-expect-error subtype is required
format({ type: 'text' });
// @ts-expect-error patterns must be strings
is(header, [1]);
void [result, matched, normalized];
import Negotiator, { Negotiator as NamedNegotiator } from 'vnegotiator';
import Accepts from 'vaccepts';
const request = { headers: { accept: 'text/html' } };
const negotiator: Negotiator.Instance = new NamedNegotiator(request);
const encoding: string | undefined = negotiator.encoding(['gzip'], { preferred: ['gzip'] });
const accepts: Accepts.Instance = Accepts(request);
const accepted: string | false = accepts.types(['html', 'json'] as const);
const all: string[] = accepts.types();
// @ts-expect-error values must be strings
accepts.types([1]);
void [encoding, accepted, all];
`;
  for (const extension of ['cts', 'mts']) fs.writeFileSync(path.join(directory, 'consumer.' + extension), source);
  fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ files: ['consumer.cts', 'consumer.mts'], compilerOptions: {
    strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [], skipLibCheck: false,
    module: 'NodeNext', moduleResolution: 'NodeNext',
  } }));
  for (const manager of ['npm', 'bun']) {
    // Bun resolves transitive version requests through the registry unless the
    // unpublished package names are explicitly redirected to these archives.
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
      name: 'vpm-media-archive-consumer', private: true, dependencies,
      ...(manager === 'bun' ? { overrides: dependencies } : {}),
    }));
    run(manager, manager === 'npm'
      ? ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(directory, 'npm-cache')]
      : ['install', '--ignore-scripts']);
    for (const runtime of [process.execPath, 'bun']) for (const extension of ['cjs', 'mjs']) run(runtime, ['consumer.' + extension]);
    const tsc = compiler();
    const output = run(process.execPath, [tsc.path, '-p', 'tsconfig.json', '--listFiles', '--pretty', 'false']);
    assert.doesNotMatch(output, /\/packages\/|\/vnode-types\/|\/v?undici-types\/|lib\.dom/);
    assert.match(output, /node_modules\/vmedia-typer\/index\.d\.ts/);
    assert.match(output, /node_modules\/vtype-is\/index\.d\.ts/);
    assert.match(output, /node_modules\/vnegotiator\/index\.d\.ts/);
    assert.match(output, /node_modules\/vaccepts\/index\.d\.ts/);
    console.log(`${manager} archives: Node/Bun CJS and ESM, TypeScript ${tsc.version} CJS and ESM without platform types passed.`);
    fs.rmSync(path.join(directory, 'node_modules'), { recursive: true, force: true });
    fs.rmSync(path.join(directory, 'package-lock.json'), { force: true });
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
