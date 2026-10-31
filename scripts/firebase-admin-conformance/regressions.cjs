'use strict';
// Reproduces defects in firebase-admin 14.5.0 with the original, then checks
// vfirebase-admin. Each case runs in a fresh process per library.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const libraries = {
  upstream: path.join(__dirname, 'node_modules/firebase-admin'),
  vpm: path.resolve(__dirname, '../../packages/vfirebase-admin'),
};

function run(library, body) {
  const source = `
    const root = ${JSON.stringify(libraries[library])};
    const entry = name => require(require.resolve(name, {paths: [root]}).startsWith(root) ? require.resolve(name, {paths: [root]}) : root);
    (async () => { const result = await (async () => { ${body} })();
      process.stdout.write(JSON.stringify({result}), () => process.exit()); })()
      .catch(error => process.stdout.write(JSON.stringify({thrown: error.stack}), () => process.exit()));`;
  const child = spawnSync(process.execPath, ['-e', source], {encoding: 'utf8', timeout: 120000, cwd: libraries[library]});
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.thrown, undefined, result.thrown);
  return result.result;
}
const both = body => ({upstream: run('upstream', body), vpm: run('vpm', body)});

// Public keys: while the keys are missing or expired, every concurrent token
// verification starts its own key request. A cold Cloud Functions instance
// serving concurrent requests fetches Google's certificates once per request.
{
  const {upstream, vpm} = both(`
    const http = require('node:http');
    const {UrlKeyFetcher, JwksFetcher} = require(root + '/lib/utils/jwt.js');
    const {publicKey} = require('node:crypto').generateKeyPairSync('rsa', {modulusLength: 2048});
    const jwk = {...publicKey.export({format: 'jwk'}), kid: 'k1', use: 'sig', alg: 'RS256'};
    let requests = 0;
    const server = http.createServer((request, response) => {
      requests++;
      setTimeout(() => {
        response.setHeader('content-type', 'application/json');
        response.setHeader('cache-control', 'public, max-age=3600');
        response.end(request.url === '/jwks' ? JSON.stringify({keys: [jwk]}) : JSON.stringify({kid: 'cert'}));
      }, 20);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const certs = new UrlKeyFetcher(base + '/certs');
    const results = await Promise.all(Array.from({length: 20}, () => certs.fetchPublicKeys()));
    const certRequests = requests; requests = 0;
    await certs.fetchPublicKeys();
    const cachedRequests = requests; requests = 0;
    const jwks = new JwksFetcher(base + '/jwks');
    await Promise.all(Array.from({length: 20}, () => jwks.fetchPublicKeys()));
    server.close();
    return {certRequests, cachedRequests, jwksRequests: requests, same: results.every(keys => keys.kid === 'cert')};`);
  assert.deepEqual(upstream, {certRequests: 20, cachedRequests: 0, jwksRequests: 20, same: true});
  assert.deepEqual(vpm, {certRequests: 1, cachedRequests: 0, jwksRequests: 1, same: true});
}

// HTTP/2 requests (FCM sends) carry ':scheme: https:' with the URL parser's
// colon. RFC 9113 requires the bare scheme; Node's HTTP/2 server rejects the
// stream with PROTOCOL_ERROR before any handler runs.
{
  const {upstream, vpm} = both(`
    const http2 = require('node:http2');
    const {Http2Client, Http2SessionHandler} = require(root + '/lib/utils/api-request.js');
    const server = http2.createServer();
    const seen = [];
    server.on('stream', (stream, headers) => { seen.push(headers[':scheme']); stream.respond({':status': 200, 'content-type': 'application/json'}); stream.end('{"ok":true}'); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    const session = new Http2SessionHandler(url);
    const outcome = await new Http2Client().send({method: 'GET', url: url + '/v1/check', http2SessionHandler: session})
      .then(response => 'status ' + response.status, error => 'rejected: ' + error.message);
    session.close(); server.close();
    return {outcome, seen};`);
  if (process.versions.bun) {
    // Bun's HTTP/2 server accepts the malformed value; it arrives verbatim.
    assert.deepEqual(upstream, {outcome: 'status 200', seen: ['http:']});
  } else {
    assert.match(upstream.outcome, /^rejected: .*NGHTTP2_PROTOCOL_ERROR/);
    assert.deepEqual(upstream.seen, []);
  }
  assert.deepEqual(vpm, {outcome: 'status 200', seen: ['http']});
}

// Loading the services a Cloud Functions backend uses: upstream's Firestore
// loads @google-cloud/firestore-api 0.2.0's own google-gax stack at import,
// before any request; VPM loads its single gax stack when a request needs it.
{
  const {upstream, vpm} = both(`
    const name = require(root + '/package.json').name;
    const app = require(name + '/app').initializeApp({projectId: 'p'});
    require(name + '/auth').getAuth(app);
    require(name + '/firestore').getFirestore(app);
    require(name + '/messaging').getMessaging(app);
    require(name + '/storage').getStorage(app);
    const files = Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const gax = new Set(files.filter(f => /\\/v?google-gax\\/build\\/src\\/index\\.js$/.test(f)));
    return {modules: files.length, gaxLoaded: gax.size};`);
  assert.ok(upstream.modules > 600 && vpm.modules < 400, JSON.stringify([upstream.modules, vpm.modules]));
  assert.deepEqual([upstream.gaxLoaded, vpm.gaxLoaded], [1, 0]);
}

console.log('Reproduced and fixed one public-key request per concurrent token verification (ID tokens and JWKS), HTTP/2 requests rejected by conforming servers, and gax loaded before any request; loading app, auth, Firestore, messaging and Storage takes about half the modules.');
