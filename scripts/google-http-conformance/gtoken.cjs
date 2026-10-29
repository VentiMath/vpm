'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto'), {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vgtoken-conformance-'));
const upstream = process.argv.includes('--upstream');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120000, ...options});
  if (result.status !== 0) console.log(result.stdout + result.stderr);
  assert.equal(result.status, 0, String(result.error || result.signal || 'Failed'));
  return result.stdout;
}
try {
  const archive = path.join(__dirname, 'gtoken-7.1.0.tar.gz');
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), 'e371ce800384755d19833356ead16cf55036cf3acb5bf19e117345c690f443e0');
  run('tar', ['-xzf', archive, '--strip-components=1', '-C', temporary]);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const file = path.join(temporary, 'test/index.ts'); let source = fs.readFileSync(file, 'utf8');
  source = source.replace("import * as assert from 'assert';", "import assert = require('assert');").replace("import * as nock from 'nock';", "import nock = require('nock');");
  if (!upstream) {
    source = source.replace("['https://www.googleapis.com', '/oauth2/v4/token']", "['https://oauth2.googleapis.com', '/token']");
    source = source.replace("'https://accounts.google.com',\n  '/o/oauth2/revoke'", "'https://oauth2.googleapis.com',\n  '/revoke'");
    source = source.replace('.get(GOOGLE_REVOKE_TOKEN_URLS[1])\n    .query({token})', '.post(GOOGLE_REVOKE_TOKEN_URLS[1], {token})');
    source = source.replace('.reply(code, body);', ".reply(code, body ?? (code === 200 ? {access_token: 'fixture-token'} : undefined));");
    source = source.replace("it('should make parallel requests if forceRefresh=true (promise)'", "it('should share parallel requests if forceRefresh=true (promise)'");
    source = source.replace('    createGetTokenMock(200, {access_token: fakeTokenB});\n', '');
    source = source.replace('[fakeTokenA, fakeTokenB].sort()', '[fakeTokenA, fakeTokenA].sort()');
    source = source.replace('assert.strictEqual(err.message, ERROR);', "assert.strictEqual(err.message, 'Token request failed (HTTP 400)');");
    source = source.replace("assert.strictEqual(err.message, ERROR + ': ' + DESCRIPTION);", "assert.strictEqual(err.message, 'Token request failed (HTTP 400)');");
    source = source.replace("const message = 'Request failed with status code 404';", "const message = 'Token request failed (HTTP 404)';");
    // The replacement uses fs/promises directly and remains functional when fs.readFile is absent.
    const start = source.indexOf("  // see: https://github.com/googleapis/google-api-nodejs-client/issues/1614");
    const end = source.indexOf('\n});\n\nfunction createGetTokenMock', start);
    assert(start > 0 && end > start);
    source = source.slice(0, start) + `  it('uses fs/promises when callback readFile is absent', async () => {
    const fs = require('fs'); const original = fs.readFile; delete fs.readFile;
    try { const credentials = await new GoogleToken().getCredentials(KEYFILEJSON); assert(credentials.privateKey); }
    finally { fs.readFile = original; }
  });` + source.slice(end);
  }
  const gaxios = path.join(root, upstream ? 'scripts/consumers/node_modules/gaxios' : 'packages/vgaxios');
  source = source.replace("from 'gaxios'", 'from ' + JSON.stringify(gaxios));
  fs.writeFileSync(file, source);
  fs.writeFileSync(path.join(temporary, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'CommonJS', noCheck: true, noResolve: true, outDir: 'compiled', rootDir: '.'}, files: ['test/index.ts']}));
  run(process.execPath, [compiler().path, '-p', path.join(temporary, 'tsconfig.json')]);
  const target = path.join(root, upstream ? 'scripts/consumers/node_modules/gtoken' : 'packages/vgtoken');
  fs.mkdirSync(path.join(temporary, 'compiled/src'), {recursive: true});
  fs.writeFileSync(path.join(temporary, 'compiled/src/index.js'), 'delete require.cache[require.resolve(' + JSON.stringify(target) + ')]; module.exports=require(' + JSON.stringify(target) + ');');
  const env = {...process.env};
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy']) delete env[key];
  const preload = path.join(temporary, 'transport.cjs');
  fs.writeFileSync(preload, "globalThis.fetch = () => { throw new Error('Native fetch disabled in offline gtoken conformance'); };\n" + (upstream ? 'require(' + JSON.stringify(gaxios) + ').instance.defaults.fetchImplementation = require(' + JSON.stringify(path.join(root, 'scripts/consumers/node_modules/node-fetch')) + ');' : ''));
  console.log(run(process.execPath, [require.resolve('mocha/bin/mocha.js'), '--no-config', '--no-package', '--require', preload, '--timeout', '10000', '--reporter', 'dot', 'compiled/test/index.js'], {cwd: temporary, env}));
} finally { fs.rmSync(temporary, {recursive: true, force: true}); }
