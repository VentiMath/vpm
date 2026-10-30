'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const {compiler} = require('../platform-types.cjs');
const upstream = process.argv.includes('--upstream'), source = path.join(__dirname, 'upstream');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source, file))).digest('hex'), hash, file);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vteeny-conformance-'));
try {
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(temporary, 'test'));
  for (const name of ['index', 'agents', 'TeenyStatistics']) {
    let text = fs.readFileSync(path.join(source, 'test', name + '.ts.txt'), 'utf8');
    text = text.replace("from 'mocha'", 'from ' + JSON.stringify(path.join(__dirname, 'harness.cjs')));
    if (name === 'index') text = text.replace("require('http-proxy-agent');", "require('http-proxy-agent').HttpProxyAgent;").replace("require('https-proxy-agent');", "require('https-proxy-agent').HttpsProxyAgent;");
    if (!upstream) for (const pkg of ['http-proxy-agent', 'https-proxy-agent']) text = text.replaceAll("require('" + pkg + "')", 'require(' + JSON.stringify(path.resolve(__dirname, '../../packages/v' + pkg)) + ')');
    fs.writeFileSync(path.join(temporary, 'test', name + '.ts'), text);
  }
  fs.writeFileSync(path.join(temporary, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'CommonJS', esModuleInterop: true, noCheck: true, outDir: 'compiled', rootDir: '.'}, include: ['test/*.ts']}));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', path.join(temporary, 'tsconfig.json')], {encoding: 'utf8'});
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  fs.mkdirSync(path.join(temporary, 'compiled/src'));
  const base = upstream ? path.join(__dirname, 'node_modules/teeny-request/build/src') : path.resolve(__dirname, '../../packages/vteeny-request');
  fs.writeFileSync(path.join(temporary, 'compiled/src/index.js'), `const library=require(${JSON.stringify(base)});module.exports={teenyRequest:require(${JSON.stringify(path.join(__dirname, 'harness.cjs'))}).track(library.teenyRequest)};`);
  for (const [name, file] of [['agents', upstream ? 'agents' : 'lib/agents'], ['TeenyStatistics', upstream ? 'TeenyStatistics' : 'lib/statistics']]) fs.writeFileSync(path.join(temporary, 'compiled/src', name + '.js'), `module.exports=require(${JSON.stringify(path.join(base, file))});`);
  // Close pooled sockets as well as clearing the map, for both implementations.
  const setup = path.join(temporary, 'setup.cjs');
  fs.writeFileSync(setup, (process.versions.bun ? `require(${JSON.stringify(require.resolve('nock'))});const https=require('node:https'),original=https.request;https.request=function(input,...args){if(input&&typeof input==='object'&&!(input instanceof URL))input={...input,proto:'https',port:input.port||443};return original.call(this,input,...args);};` : '') + `const pool=require(${JSON.stringify(path.join(base, upstream ? 'agents' : 'lib/agents'))}).pool;const clear=pool.clear;pool.clear=function(){for(const a of this.values())a.destroy();return clear.call(this);};`);
  const result = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'), '--reporter', 'json', '--timeout', '5000', '--require', setup, ...['agents', 'TeenyStatistics', 'index'].map(name => path.join(temporary, 'compiled/test', name + '.js'))], {encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024});
  assert.ifError(result.error);
  const report = JSON.parse(result.stdout);
  const expected = upstream && !process.versions.bun ? ['should allow setting compress/gzip to true', 'should not wrap the error'] : [];
  assert.deepEqual(report.failures.map(test => test.title).sort(), expected, result.stdout + result.stderr);
  assert.equal(result.status, expected.length);
  assert.equal(report.passes.length, 116 - expected.length); assert.equal(report.pending.length, 2);
  console.log(`${upstream ? 'teeny-request' : 'vteeny-request'}: ${report.passes.length} passed, 2 upstream skips, ${expected.length} expected control failures; every callback and stream assertion awaited.`);
} finally {fs.rmSync(temporary, {recursive: true, force: true});}
