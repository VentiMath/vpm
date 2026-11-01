'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {createRequire} = require('node:module'), {spawnSync} = require('node:child_process');
const mode = process.argv[2];
if (!mode) {
  for (const variant of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, variant], {encoding: 'utf8', timeout: 30000});
    assert.equal(child.status, 0, child.stdout + child.stderr); process.stdout.write(child.stdout);
  }
} else main().catch(error => {console.error(error); process.exitCode = 1;});
async function main() {
  const vpm = mode === 'vpm';
  const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const load = createRequire(root + '/package.json');
  const sdk = load(vpm ? 'vgoogle-auth-library' : 'google-auth-library');
  const {ServiceAccountCredential, ApplicationDefaultCredential} = require(root + '/lib/app/credential-internal');
  const factory = require(root + '/lib/app/credential-factory');
  const certificate = JSON.parse(fs.readFileSync(path.join(__dirname, 'upstream/test/resources/mock.key.json'), 'utf8'));
  const refresh = {type: 'authorized_user', client_id: 'test', client_secret: 'test-secret', refresh_token: 'test-refresh'};
  const agentA = {}, agentB = {};
  for (const make of [agent => factory.applicationDefault(agent), agent => factory.cert(certificate, agent), agent => factory.refreshToken(refresh, agent)]) {
    assert.equal(make(agentA), make(agentA));
    assert.equal(make(agentA) === make(agentB), !vpm, 'credentials must respect the requested transport');
  }
  const fromJSON = sdk.GoogleAuth.prototype.fromJSON, getClient = sdk.GoogleAuth.prototype.getClient;
  let seen, seenAgent, tokenCalls = 0;
  const fakeClient = {credentials: {access_token: 'test-access', expiry_date: Date.now() + 3600000, refresh_token: 'private-refresh'},
    quotaProjectId: 'quota-project', async getAccessToken() {tokenCalls++; return {token: this.credentials.access_token};}};
  sdk.GoogleAuth.prototype.fromJSON = function(data, options = {}) {seen = data; seenAgent = options.transporterOptions?.agent; return fakeClient;};
  sdk.GoogleAuth.prototype.getClient = async function() {
    return this.keyFilename ? this.fromJSON(JSON.parse(fs.readFileSync(this.keyFilename, 'utf8')), this.clientOptions) : fakeClient;
  };
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-credential-controls-'));
  try {
    const frozen = Object.freeze({projectId: certificate.project_id, privateKey: certificate.private_key, clientEmail: certificate.client_email});
    const frozenCredential = new ServiceAccountCredential(frozen, agentA);
    if (vpm) {await frozenCredential.getAccessToken(); assert.equal(seenAgent, agentA);}
    else await assert.rejects(frozenCredential.getAccessToken(), TypeError);
    const mutable = {...certificate};
    const captured = new ServiceAccountCredential(mutable, agentA);
    mutable.client_email = 'changed@example.com';
    const token = await captured.getAccessToken();
    assert.equal(seen.client_email, vpm ? certificate.client_email : mutable.client_email, 'validated and consumed credential must be the same snapshot');
    assert.equal(seenAgent, vpm ? agentA : undefined, 'JSON auth client receives the agent option');
    assert.equal(Object.hasOwn(token, 'refresh_token'), !vpm, 'access-token result must not expose refresh credentials');

    const file = path.join(temporary, 'key.json');
    fs.writeFileSync(file, JSON.stringify(certificate));
    const fileCredential = new ServiceAccountCredential(file);
    fs.writeFileSync(file, JSON.stringify({...certificate, client_email: 'rotated@example.com'}));
    await fileCredential.getAccessToken();
    assert.equal(seen.client_email, vpm ? certificate.client_email : 'rotated@example.com', 'validated file contents are used for authentication');
    const first = factory.cert(file);
    fs.writeFileSync(file, JSON.stringify({...certificate, client_email: 'rotated-again@example.com'}));
    const rotated = factory.cert(file);
    assert.equal(first === rotated, !vpm, 'a new factory call observes a rotated file');

    const adc = new ApplicationDefaultCredential();
    const barrier = Promise.withResolvers(); let discoveries = 0;
    adc.googleAuth.getClient = async () => {discoveries++; await barrier.promise; return fakeClient;};
    tokenCalls = 0;
    const requests = Array.from({length: 20}, () => adc.getAccessToken());
    barrier.resolve(); await Promise.all(requests);
    assert.equal(discoveries, vpm ? 1 : 20);
    assert.equal(tokenCalls, vpm ? 1 : 20);
    assert.equal(adc.getQuotaProjectId(), 'quota-project');
    await assert.rejects(adc.getIDToken('https://example.com'), /Compute Engine/);
    let projectCalls = 0;
    adc.googleAuth.getProjectId = async () => {projectCalls++; return 'project';};
    assert.deepEqual(await Promise.all([adc.getProjectId(), adc.getProjectId()]), ['project', 'project']);
    assert.equal(projectCalls, vpm ? 1 : 2);
    let emails = 0;
    adc.googleAuth.getCredentials = async () => {emails++; return {};};
    assert.equal(await adc.getServiceAccountEmail(), ''); assert.equal(await adc.getServiceAccountEmail(), '');
    assert.equal(emails, vpm ? 1 : 2);

    for (const expiry_date of [NaN, Infinity, Date.now() - 1000]) {
      const invalid = new ApplicationDefaultCredential();
      invalid.googleAuth.getClient = async () => ({credentials: {access_token: 'private-access', expiry_date}, getAccessToken: async () => {}});
      if (vpm) await assert.rejects(invalid.getAccessToken(), error => error.code === 'app/invalid-credential' && !String(error).includes('private-access'));
      else await invalid.getAccessToken();
    }
    const retry = new ApplicationDefaultCredential(); let attempts = 0;
    retry.googleAuth.getClient = () => {if (++attempts === 1) throw Error('retryable'); return fakeClient;};
    await assert.rejects(retry.getAccessToken(), /retryable/);
    assert.equal((await retry.getAccessToken()).access_token, 'test-access');

    const poolAgent = {};
    const initial = factory.refreshToken(refresh, poolAgent);
    for (let i = 0; i < 65; i++) factory.refreshToken({...refresh, refresh_token: 'rotation-' + i}, poolAgent);
    assert.equal(factory.refreshToken(refresh, poolAgent) === initial, !vpm, 'bounded credential retention');

    fs.writeFileSync(file, '!credential-secret');
    try {new ServiceAccountCredential(file); assert.fail('invalid JSON must fail');}
    catch (error) {
      assert.ok(error.cause instanceof SyntaxError);
      if (vpm) assert.doesNotMatch(error.message + error.cause.message, /credential-secret/);
      else if (!process.versions.bun) assert.match(error.message + error.cause.message, /credential-secret/);
    }
    if (vpm) {
      assert.throws(() => factory.cert({...certificate, toJSON: () => ({})}), /JSON data/);
      assert.throws(() => factory.cert({...certificate, clientEmail: 'conflict@example.com'}), /conflict/);
      assert.throws(() => factory.refreshToken({...refresh, source: refresh, circular: null, bad: undefined}), /JSON data/);
      assert.throws(() => factory.cert({...certificate, type: 'external_account'}), /service_account/);
      assert.throws(() => factory.refreshToken({...refresh, type: 'service_account'}), /authorized_user/);
    }
    let hookCalls = 0;
    const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON');
    Object.defineProperty(Array.prototype, 'toJSON', {configurable: true, value() {hookCalls++; return 'masked';}});
    try {factory.cert({...certificate, delegates: ['test']}, {}); assert.equal(hookCalls > 0, !vpm);}
    finally {if (descriptor) Object.defineProperty(Array.prototype, 'toJSON', descriptor); else delete Array.prototype.toJSON;}
  } finally {
    sdk.GoogleAuth.prototype.fromJSON = fromJSON; sdk.GoogleAuth.prototype.getClient = getClient;
    fs.rmSync(temporary, {recursive: true, force: true});
  }
  console.log(`${mode}: credential snapshots, transport ownership, discovery, token projection and cache controls passed`);
}
