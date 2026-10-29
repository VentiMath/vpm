'use strict';
const http = require('node:http');
const assert = require('node:assert/strict');
const {Readable} = require('node:stream');
module.exports = async function(from) {
  const {teenyRequest} = from('teeny-request');
  const {Gaxios} = require('../../packages/vgaxios');
  const {JWT, Compute, GoogleAuth} = from('google-auth-library');
  const metadata = from('gcp-metadata');
  const oldMetadataHost = process.env.GCE_METADATA_HOST, oldMetadataIp = process.env.GCE_METADATA_IP;
  const logging = from('google-logging-utils');
  const oldFlag = process.env[logging.env.nodeEnables], records = [];
  try {
    process.env[logging.env.nodeEnables] = '*';
    logging.setBackend(logging.getStructuredBackend({setFilters() {}, log: (_name, _fields, json) => records.push(JSON.parse(json))}));
    logging.log('vpm-integration').info('HTTP client ready');
    assert.deepEqual(records, [{severity: 'INFO', message: 'HTTP client ready'}]);
  } finally {
    logging.setBackend(undefined);
    if (oldFlag === undefined) delete process.env[logging.env.nodeEnables]; else process.env[logging.env.nodeEnables] = oldFlag;
  }
  const nativeJSON = globalThis.JSON, oldBigInt = process.env.CE_USE_BIG_INT;
  try {
    process.env.CE_USE_BIG_INT = 'true';
    const {JSONParser} = from('cloudevents/dist/parsers.js');
    const event = new JSONParser().parse('{"id":1234567890123456789,"message":"quoted \\"value\\""}');
    assert.equal(event.id, 1234567890123456789n);
    assert.equal(event.message, 'quoted "value"');
    assert.equal(globalThis.JSON.stringify(event), '{"id":1234567890123456789,"message":"quoted \\"value\\""}');
  } finally {
    globalThis.JSON = nativeJSON;
    if (oldBigInt === undefined) delete process.env.CE_USE_BIG_INT; else process.env.CE_USE_BIG_INT = oldBigInt;
  }
  const {readFileSync} = require('node:fs');
  const {join} = require('node:path');
  const {verify, createPublicKey} = require('node:crypto');
  const key = readFileSync(join(__dirname, '../../packages/vgtoken/test/key.pem'), 'utf8');
  let assertions = 0;
  let attempts = 0;
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      response.setHeader('content-type', 'application/json');
      if (request.url.startsWith('/computeMetadata/v1/')) {
        assert.equal(request.headers['metadata-flavor'], 'Google');
        response.setHeader('Metadata-Flavor', 'Google');
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname.endsWith('/project-id')) response.end('consumer-project');
        else if (url.pathname.endsWith('/universe-domain')) { response.statusCode = 404; response.end('private error body'); }
        else if (url.pathname.endsWith('/identity')) { assert.equal(url.searchParams.get('audience'), 'https://consumer.example.test'); response.end('metadata-id-token'); }
        else if (url.pathname.endsWith('/token')) response.end(JSON.stringify({access_token:'metadata-access-token',expires_in:3600,token_type:'Bearer'}));
        else response.end('{"numericProjectId":3279739563200103600}');
        return;
      }
      if (request.url === '/token') {
        const form = new URLSearchParams(body), assertion = form.get('assertion');
        assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        const [header, payload, signature] = assertion.split('.');
        assert(verify('RSA-SHA256', Buffer.from(header + '.' + payload), createPublicKey(key), Buffer.from(signature, 'base64url')));
        const claims = JSON.parse(Buffer.from(payload, 'base64url'));
        assert.equal(claims.iss, 'service@example.test');
        assertions++;
        response.end(JSON.stringify(claims.target_audience ? {id_token: 'consumer-id-token'} : {access_token: 'consumer-access-token', expires_in: 3600, token_type: 'Bearer'}));
        return;
      }
      if (request.url === '/retry' && ++attempts === 1) response.statusCode = 503;
      response.end(JSON.stringify({type: request.headers['content-type'], body, url: request.url}));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new Gaxios({noProxy: ['*'], responseType: 'json'});
  try {
    const uri = 'http://127.0.0.1:' + server.address().port;
    const result = await new Promise((resolve, reject) => teenyRequest({uri, method: 'POST', headers: {}, multipart: [{'Content-Type': 'application/json', body: '{"metadata":true}'}, {'Content-Type': 'text/plain', body: Readable.from(['payload'])}]}, (error, response, body) => error ? reject(error) : resolve(body)));
    const boundary = result.type.split('boundary=')[1];
    assert.match(boundary, /^[a-f0-9-]{36}$/);
    assert(result.body.includes(boundary));
    assert(result.body.includes('payload'));
    assert(result.body.includes('"metadata":true'));
    const ordinary = await client.request({url: uri + '/query', method: 'POST', params: {q: 'a b'}, data: {ok: true}});
    assert.equal(ordinary.data.url, '/query?q=a+b');
    assert.equal(ordinary.data.body, '{"ok":true}');
    const multipart = await client.request({url: uri, method: 'POST', multipart: [{headers: {'Content-Type': 'text/plain'}, content: Readable.from(['google-upload'])}]});
    assert(multipart.data.body.includes('google-upload'));
    await client.request({url: uri + '/retry', retry: true, retryConfig: {retryDelay: 0, maxRetryDelay: 0}});
    assert.equal(attempts, 2);
    const jwt = new JWT({email: 'service@example.test', key, scopes: ['scope']});
    jwt.transporter = {request: options => client.request({...options, url: uri + '/token'})};
    const tokens = await jwt.authorize();
    assert.equal(tokens.access_token, 'consumer-access-token'); assert(tokens.expiry_date > Date.now());
    assert.equal(jwt.key, key); assert.equal(jwt.email, 'service@example.test');
    assert.equal(await jwt.fetchIdToken('https://audience.example.test'), 'consumer-id-token');
    assert.equal(assertions, 2);
    delete process.env.GCE_METADATA_IP; process.env.GCE_METADATA_HOST = uri; metadata.resetIsAvailableCache();
    assert.equal(await metadata.isAvailable(), true);
    assert.equal((await metadata.instance()).numericProjectId.valueOf(), '3279739563200103600');
    const compute = new Compute();
    assert.equal((await compute.getAccessToken()).token, 'metadata-access-token');
    assert.equal(await compute.fetchIdToken('https://consumer.example.test'), 'metadata-id-token');
    const auth = new GoogleAuth();
    assert.equal(await auth.getGCEProjectId(), 'consumer-project');
    assert.equal(await auth.getUniverseDomainFromMetadataServer(), 'googleapis.com');
  } finally {
    metadata.resetIsAvailableCache();
    if (oldMetadataHost === undefined) delete process.env.GCE_METADATA_HOST; else process.env.GCE_METADATA_HOST = oldMetadataHost;
    if (oldMetadataIp === undefined) delete process.env.GCE_METADATA_IP; else process.env.GCE_METADATA_IP = oldMetadataIp;
    client.destroy?.();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
};
