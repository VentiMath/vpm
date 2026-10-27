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
  for (const name of ['vbody-parser', 'vdebug', 'vms', 'von-finished', 'vee-first', 'vqs', 'vraw-body', 'vhttp-errors', 'vstatuses', 'viconv-lite', 'vbytes', 'vmedia-typer', 'vtype-is', 'vnegotiator', 'vaccepts', 'vcontent-type', 'vmime-types', 'vmime-db']) {
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', directory, '--quiet'], path.join(root, 'packages', name));
    const archive = fs.readdirSync(directory).find(file => file.startsWith(name + '-') && file.endsWith('.tgz'));
    assert.ok(archive, name);
    const packed = path.join(directory, archive);
    dependencies[name] = 'file:' + packed;
    const metadata = JSON.parse(run('tar', ['-xOf', packed, 'package/package.json']));
    for (const version of Object.values(metadata.dependencies || {})) assert.equal(version, '0.1.0');
    if (name === 'vbody-parser') {
      assert.equal(Object.keys(metadata.dependencies).length, 9);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json',
        'lib/read.js', 'lib/utils.js', ...['json', 'raw', 'text', 'urlencoded'].flatMap(type => ['lib/types/' + type + '.js', 'types/' + type + '.d.ts'])].sort());
    }
    if (name === 'vqs') {
      assert.equal(metadata.dependencies, undefined);
      assert.equal(metadata.license, 'BSD-3-Clause');
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json',
        'lib/parse.js', 'lib/stringify.js', 'lib/utils.js', 'lib/formats.js', 'lib/limit.js'].sort());
    }
    if (name === 'viconv-lite') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]);
      assert.doesNotMatch(entries, /(?:\/test\/|safer-buffer|node_modules|\/bench\/)/);
      assert.match(entries, /package\/encodings\/tables\/gb18030-ranges.json/);
      assert.match(entries, /package\/types\/encodings.d.ts/);
      assert.match(entries, /package\/PROVENANCE.json/);
    }
    if (['vraw-body', 'vbytes', 'vmedia-typer', 'vtype-is', 'vnegotiator', 'vaccepts'].includes(name)) {
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
  }
  fs.writeFileSync(path.join(directory, 'consumer.cjs'), `
const assert = require('node:assert/strict');
const qs = require('vqs');
assert.deepEqual(qs.parse('a[b]=x&a[c][]=y'), { a: { b: 'x', c: ['y'] } });
assert.equal(qs.stringify({ a: '~* ' }, { format: qs.formats.WHATWG }), 'a=%7E*+');
assert.throws(() => qs.parse('a=1', { parameterLimit: NaN }), TypeError);
const getRawBody = require('vraw-body');
const { Readable } = require('node:stream');
const bodyParser = require('vbody-parser');
for (const type of ['json', 'raw', 'text', 'urlencoded']) assert.equal(bodyParser[type], require('vbody-parser/' + type));
(async () => {
  const request = Readable.from([Buffer.from('{"a":1}')]);
  Object.assign(request, { headers: { 'content-type': 'application/json', 'content-length': '7' }, complete: false, socket: { readable: true } });
  await new Promise((resolve, reject) => bodyParser.json()(request, {}, error => error ? reject(error) : resolve()));
  assert.deepEqual(request.body, { a: 1 });
  assert.deepEqual(await getRawBody(Readable.from([Buffer.from('abc')]), { limit: '3b' }), Buffer.from('abc'));
  assert.equal(await getRawBody(Readable.from([Buffer.from('9439da', 'hex'), Buffer.from('33', 'hex')]), 'gb18030'), '💩');
})().catch(error => { console.error(error); process.exitCode = 1; });
const iconv = require('viconv-lite');
assert.equal(iconv.decode(Buffer.from('9439da33', 'hex'), 'gb18030'), '💩');
assert.equal(iconv.decode(iconv.encode('abc', 'utf32', Object.freeze({})), 'utf32'), 'abc');
const bytes = require('vbytes');
assert.equal(bytes.parse('100kb'), 102400);
assert.throws(() => bytes.parse('100kbjunk'), TypeError);
assert.equal(bytes.format(1.01, { decimalPlaces: 4 }), '1.01B');
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
import qs, { parse as parseQuery, stringify, formats } from 'vqs';
assert.equal(qs.parse, parseQuery); assert.equal(qs.stringify, stringify); assert.equal(qs.formats, formats);
assert.deepEqual(parseQuery('__proto__[polluted]=yes&a[]=x'), { a: ['x'] });
assert.equal(Object.prototype.polluted, undefined);
import getRawBody from 'vraw-body';
import { Readable } from 'node:stream';
import bodyParser, { json, raw, text, urlencoded } from 'vbody-parser';
import jsonParser from 'vbody-parser/json';
import rawParser from 'vbody-parser/raw';
import textParser from 'vbody-parser/text';
import formParser from 'vbody-parser/urlencoded';
assert.deepEqual([json, raw, text, urlencoded], [jsonParser, rawParser, textParser, formParser]);
assert.equal(bodyParser.json, json);
const formRequest = Readable.from([Buffer.from('a=1&b=2')]);
Object.assign(formRequest, { headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '7' }, complete: false, socket: { readable: true } });
await new Promise((resolve, reject) => formParser({ parameterLimit: 2 ** 32 })(formRequest, {}, error => error ? reject(error) : resolve()));
assert.deepEqual(formRequest.body, { a: '1', b: '2' });
assert.equal(await getRawBody(Readable.from([Buffer.from('abc')]), true), 'abc');
await assert.rejects(getRawBody(Readable.from([Buffer.from('abc')]), { limit: 2 }), { status: 413 });
import iconv, { encode, decode, getDecoder } from 'viconv-lite';
assert.equal(iconv.encode, encode); assert.equal(iconv.decode, decode);
const decoder = getDecoder('gb18030');
assert.equal(decoder.write(Buffer.from('9439da', 'hex')), '');
assert.equal(decoder.write(Buffer.from('33', 'hex')), '💩');
import bytes, { parse as parseBytes, format as formatBytes } from 'vbytes';
assert.equal(bytes.parse, parseBytes); assert.equal(bytes.format, formatBytes);
assert.equal(parseBytes('-1.00000000000000000001kb'), -1025);
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
import bodyParser, { json as jsonBody, raw as rawBody, text as textBody, urlencoded as formBody } from 'vbody-parser';
import jsonParser from 'vbody-parser/json';
import rawParser from 'vbody-parser/raw';
import textParser from 'vbody-parser/text';
import formParser from 'vbody-parser/urlencoded';
declare const bodyRequest: bodyParser.Request;
const middleware: bodyParser.Middleware = jsonParser({ verify(_req, _res, buffer, charset) {
  const data: Uint8Array = buffer;
  const encoding: string | null = charset;
  buffer.toString('hex'); void [data, encoding];
} });
middleware(bodyRequest, {}, error => { void error; });
rawParser(); textParser(); formParser({ extended: true, parameterLimit: 2 ** 32 });
jsonBody(); rawBody(); textBody(); formBody();
// @ts-expect-error limits must be numbers
formParser({ parameterLimit: '1000' });
// @ts-expect-error verify receives bytes, not a string
jsonBody({ verify(_req, _res, buffer: string) {} });
import qs, { parse as parseQuery, stringify, formats } from 'vqs';
const parsedQuery: qs.ParsedObject = parseQuery('a=1', { parameterLimit: 2 });
const queryText: string = stringify({ a: ['x', 'y'] }, { format: formats.WHATWG });
// @ts-expect-error a parsed field can be an array or object
const scalarQuery: string = parsedQuery.a;
// @ts-expect-error limits require numbers
parseQuery('a=1', { depth: '2' });
void [queryText, scalarQuery];
import getRawBody from 'vraw-body';
declare const stream: getRawBody.ReadableStream;
const raw: Promise<Uint8Array> = getRawBody(stream);
const rawText: Promise<string> = getRawBody(stream, true);
getRawBody(stream, (error, buffer) => { if (!error) buffer.toString('hex'); });
// @ts-expect-error encoding must be a string or boolean
getRawBody(stream, { encoding: 3 });
void [raw, rawText];
import iconv, { encode, decode, type Encoding } from 'viconv-lite';
const charset: Encoding = 'utf8';
const encoded: Uint8Array = encode('abc', charset);
const decoded: string = decode(encoded, 'UTF-8');
encode('abc', 'utf8').toString('hex');
iconv.decodeStream('utf16be').collect((error, output) => { if (!error) output?.toUpperCase(); });
iconv.encodeStream('utf8').pipe(iconv.decodeStream('utf8'));
// @ts-expect-error decoding requires bytes
decode('abc', 'utf8');
void decoded;
import bytes, { parse as parseBytes, format as formatBytes } from 'vbytes';
const size: number = parseBytes('1kb');
const absent: null = parseBytes(undefined);
const sizeText: string | null = bytes(size, { unit: 'KB' });
const sizeOptions: bytes.Options = { decimalPlaces: 4 };
formatBytes(size, sizeOptions);
// @ts-expect-error byte sizes must be strings or numbers
parseBytes({});
void [absent, sizeText];
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
    assert.match(output, /node_modules\/vbytes\/index\.d\.ts/);
    assert.match(output, /node_modules\/viconv-lite\/index\.d\.ts/);
    assert.match(output, /node_modules\/vraw-body\/index\.d\.ts/);
    assert.match(output, /node_modules\/vqs\/index\.d\.ts/);
    assert.match(output, /node_modules\/vbody-parser\/index\.d\.ts/);
    console.log(`${manager} archives: Node/Bun CJS and ESM, TypeScript ${tsc.version} CJS and ESM without platform types passed.`);
    fs.rmSync(path.join(directory, 'node_modules'), { recursive: true, force: true });
    fs.rmSync(path.join(directory, 'package-lock.json'), { force: true });
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
