'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {createRequire} = require('node:module'), {spawnSync} = require('node:child_process'), {verify, createPublicKey} = require('node:crypto');
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
  const {GoogleAuth} = load(vpm ? 'vgoogle-auth-library' : 'google-auth-library');
  const {ServiceAccountCredential, RefreshTokenCredential} = require(root + '/lib/app/credential-internal');
  const certificate = JSON.parse(fs.readFileSync(path.join(__dirname, 'upstream/test/resources/mock.key.json'), 'utf8'));
  const key = createPublicKey(certificate.private_key);
  let agentRequests = 0, requests = 0, handlerError;
  class Agent extends http.Agent {addRequest(...args) {agentRequests++; return super.addRequest(...args);}}
  const agent = new Agent();
  const server = http.createServer(async (request, response) => {
    try {
      let text = ''; for await (const chunk of request) text += chunk;
      const form = new URLSearchParams(text);
      assert.equal(request.method, 'POST');
      if (form.get('grant_type') === 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
        const [header, payload, signature] = form.get('assertion').split('.');
        assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
        assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, certificate.client_email);
        assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + payload), key, Buffer.from(signature, 'base64url')), true);
      } else {
        assert.equal(form.get('grant_type'), 'refresh_token');
        assert.equal(form.get('refresh_token'), 'test-refresh');
        assert.equal(form.get('client_id'), 'test-client');
        assert.equal(form.get('client_secret'), 'test-secret');
      }
      requests++; response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({access_token: 'local-access', token_type: 'Bearer', expires_in: 3600}));
    } catch (error) {handlerError = error; response.statusCode = 400; response.end('{}');}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/token');
  const original = GoogleAuth.prototype.fromJSON;
  // Redirect only the destination. Signing, credential conversion, Gaxios,
  // HTTP Agent selection, the POST body and response parsing run unchanged.
  GoogleAuth.prototype.fromJSON = function(...args) {
    const client = original.apply(this, args);
    const request = client.transporter.request.bind(client.transporter);
    client.transporter.request = options => request({...options, url});
    return client;
  };
  try {
    const providers = [new ServiceAccountCredential(certificate, agent), new RefreshTokenCredential({
      type: 'authorized_user', client_id: 'test-client', client_secret: 'test-secret', refresh_token: 'test-refresh',
    }, agent)];
    for (const provider of providers) {
      const token = await provider.getAccessToken();
      assert.equal(token.access_token, 'local-access');
      assert.ok(token.expires_in > 3500 && token.expires_in <= 3600);
    }
    if (handlerError) throw handlerError;
    assert.equal(requests, 2);
    assert.equal(agentRequests, vpm ? 2 : 0, 'the configured agent must carry both token requests');
    console.log(`${mode}: signed JWT and refresh-token OAuth requests, ${agentRequests} configured-agent requests`);
  } finally {
    GoogleAuth.prototype.fromJSON = original;
    agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}
