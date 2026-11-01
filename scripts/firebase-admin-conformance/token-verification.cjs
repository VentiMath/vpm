'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  const normal = [];
  for (const kind of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, kind], {encoding: 'utf8', timeout: 60000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
    normal.push(JSON.parse(child.stdout));
  }
  assert.deepEqual(normal[0], normal[1]);
  console.log(`Auth verification: ${normal[0].length} signed-token results match; subject, malformed-claim and revocation controls pass.`);
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = variant === 'vpm';
  const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {initializeApp, deleteApp} = require(root + '/lib/app');
  const {getAuth} = require(root + '/lib/auth');
  const verifier = require(root + '/lib/auth/token-verifier');
  const {authClientErrorCode: codes} = require(root + '/lib/auth/error');
  // Public, test-only fixture key retained with the upstream conformance tests.
  const key = require('./upstream/test/resources/mock.key.json').private_key;
  const publicKey = crypto.createPublicKey(key).export({type: 'spki', format: 'pem'});
  const app = initializeApp({projectId: 'p', credential: {getAccessToken: async () => ({access_token: 'fixture', expires_in: 3600})}});
  const auth = getAuth(app), id = auth.idTokenVerifier, session = verifier.createSessionCookieVerifier(app), blocking = verifier.createAuthBlockingTokenVerifier(app);
  for (const item of [id, session, blocking]) item.signatureVerifier.keyFetcher.fetchPublicKeys = async () => ({fixture: publicKey});
  const now = Math.floor(Date.now() / 1000);
  const base = {sub: 'one', aud: 'p', iss: 'https://securetoken.google.com/p', iat: now - 120, auth_time: now - 120, exp: now + 600};
  const mint = (payload, header = {alg: 'RS256', kid: 'fixture'}) => {
    const input = [header, payload].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
    return input + '.' + crypto.sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
  };
  const outcome = async operation => {
    try {return {value: await operation()};} catch (error) {return {code: error.code, type: error.constructor.name};}
  };
  let user = {uid: 'one', disabled: false, tokensValidAfterTime: new Date((now - 180) * 1000).toUTCString()};
  auth.getUser = async uid => {assert.equal(uid, 'one'); return user;};
  try {
    const normal = [];
    for (const extra of [{}, {role: 'teacher'}, {event_type: 'beforeSendSms'}, {uid: 'untrusted-alias'}]) {
      const result = await auth.verifyIdToken(mint({...base, ...extra}), true);
      normal.push({uid: result.uid, sub: result.sub, role: result.role});
    }
    for (const change of [{aud: 'wrong'}, {iss: 'https://wrong/p'}, {sub: ''}, {exp: now - 1}]) {
      normal.push(await outcome(() => auth.verifyIdToken(mint({...base, ...change}))));
    }
    const token = mint(base), [header, payload, signature] = token.split('.');
    const tampered = header + '.' + Buffer.from(JSON.stringify({...base, role: 'admin'})).toString('base64url') + '.' + signature;
    normal.push(await outcome(() => auth.verifyIdToken(tampered)));
    assert.equal(normal.at(-1).code, 'auth/argument-error');
    normal.push(await outcome(() => auth.verifyIdToken(mint(base, {alg: 'RS256', kid: 'missing'}))));
    assert.equal(normal.at(-1).code, 'auth/argument-error');
    user = {...user, disabled: true};
    normal.push(await outcome(() => auth.verifyIdToken(token, true)));
    assert.equal(normal.at(-1).code, 'auth/user-disabled');
    user = {...user, disabled: false, tokensValidAfterTime: new Date((now - 60) * 1000).toUTCString()};
    normal.push(await outcome(() => auth.verifyIdToken(token, true)));
    assert.equal(normal.at(-1).code, 'auth/id-token-revoked');

    // Blocking events can legitimately have no subject; ID/session tokens cannot.
    for (const event_type of ['beforeSendSms', 'beforeSendEmail']) {
      for (const sub of ['', undefined]) {
        const result = await outcome(() => id.verifyJWT(mint({...base, sub, event_type})));
        if (vpm) assert.equal(result.code, 'auth/argument-error');
        else assert.ok(result.value);
        const cookie = await outcome(() => session.verifyJWT(mint({...base, iss: 'https://session.firebase.google.com/p', sub, event_type})));
        if (vpm) assert.equal(cookie.code, 'auth/argument-error');
        else assert.ok(cookie.value);
        const event = await blocking._verifyAuthBlockingToken(mint({...base, sub, event_type, aud: 'https://us-central1-p.cloudfunctions.net/function'}), false);
        assert.equal(event.event_type, event_type);
      }
    }
    // These are signed malformed claims, not forged Google tokens. Revocation
    // must not turn NaN comparisons into successful authentication.
    for (const auth_time of [undefined, 'not-a-time', {}, String(now), 1e308]) {
      const result = await outcome(() => auth.verifyIdToken(mint({...base, auth_time}), true));
      if (vpm) assert.equal(result.code, 'auth/argument-error');
      else assert.equal(result.value.uid, 'one');
    }
    const legacy = await outcome(() => id.verifyJWT(mint({...base, v: 0, d: null}, {alg: 'HS256'})));
    if (vpm) assert.equal(legacy.code, 'auth/argument-error');
    else assert.equal(legacy.type, 'TypeError');
    const badAudience = await outcome(() => blocking._verifyAuthBlockingToken(mint({...base, aud: null}), false));
    if (vpm) assert.equal(badAudience.code, 'auth/argument-error');
    else assert.equal(badAudience.type, 'TypeError');

    let release;
    auth.getUser = () => new Promise(resolve => {release = resolve;});
    const mutable = {...base};
    const pending = outcome(() => auth.verifyDecodedJWTNotRevokedOrDisabled(mutable, codes.ID_TOKEN_REVOKED));
    mutable.auth_time = now;
    release(user);
    const changed = await pending;
    if (vpm) assert.equal(changed.code, 'auth/id-token-revoked');
    else assert.equal(changed.value.uid, undefined);
    if (vpm) {
      auth.getUser = async () => ({...user, tokensValidAfterTime: 'invalid'});
      assert.equal((await outcome(() => auth.verifyDecodedJWTNotRevokedOrDisabled(base, codes.ID_TOKEN_REVOKED))).code, 'auth/internal-error');
    }
    process.stdout.write(JSON.stringify(normal));
  } finally {await deleteApp(app);}
}
