'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  const results = [];
  for (const name of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, name], {encoding: 'utf8', timeout: 30000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
    results.push(JSON.parse(child.stdout));
  }
  assert.deepEqual(results[0], results[1]);
  console.log(`User records: ${results[0].length} original/VPM projections match; prototype, constructor, deep and detached-output controls pass.`);
} else {
  const vpm = variant === 'vpm';
  const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {UserRecord, UserMetadata, UserInfo, MultiFactorSettings, TotpMultiFactorInfo} = require(root + '/lib/auth/user-record');
  const outcomes = [];
  for (let i = 0; i < 160; i++) {
    const response = {localId: 'user-' + i, createdAt: String(1000000000000 + i * 1000),
      lastLoginAt: i % 2 ? undefined : '1700000000000', lastRefreshAt: i % 3 ? undefined : '2026-10-31T12:30:00Z',
      validSince: i % 4 ? '1234567890' : undefined, emailVerified: !!(i % 2), disabled: !!(i % 3),
      providerUserInfo: i % 3 ? [{rawId: 'provider-' + i, providerId: 'google.com', email: 'test@example.com'}] : [],
      customAttributes: i % 2 ? JSON.stringify({role: 'teacher', groups: [i, {class: 'math'}]}) : undefined,
      passwordHash: i % 3 === 0 ? 'UkVEQUNURUQ=' : i % 3 === 1 ? 'hash' : undefined,
      mfaInfo: [{unknown: true}, ...(i % 2 ? [{mfaEnrollmentId: 'phone', phoneInfo: '+15555550100', enrolledAt: '2026-10-31T00:00:00Z'}] : [])]};
    const user = new UserRecord(response);
    outcomes.push({user: user.toJSON(), keys: Object.keys(user), metadata: new UserMetadata(response).toJSON(),
      factors: new MultiFactorSettings(response).toJSON()});
    assert.equal(user.uid, response.localId);
    assert.throws(() => {user.uid = 'changed';}, TypeError);
  }
  for (const mfaInfo of [[], [{phoneInfo: 'missing-id'}], [{mfaEnrollmentId: 'unknown'}]]) {
    assert.deepEqual(new MultiFactorSettings({mfaInfo}).toJSON(), {enrolledFactors: []});
  }
  assert.throws(() => new UserInfo({rawId: 'no-provider'}), /Invalid user info response/);
  for (const providerUserInfo of [{}, {length: 0}]) {
    assert.throws(() => new UserRecord({localId: 'bad-providers', providerUserInfo}), TypeError);
  }
  assert.equal(new UserRecord({localId: 'iterable', providerUserInfo:
    new Set([{rawId: 'p', providerId: 'google.com'}])}).providerData[0].providerId, 'google.com');

  // Each original control runs in a separate process. The marker is benign,
  // and cleanup occurs before any other operation can observe the prototype.
  const marker = 'vpmUserRecordPrototypeMarker';
  const poisoned = new UserRecord({localId: 'claims', customAttributes: '{"__proto__":{"vpmUserRecordPrototypeMarker":true}}'});
  let output, polluted;
  try {output = poisoned.toJSON(); polluted = Object.hasOwn(Object.prototype, marker);}
  finally {delete Object.prototype[marker];}
  assert.equal(polluted, !vpm);
  if (vpm) {
    assert.ok(Object.hasOwn(output.customClaims, '__proto__'));
    assert.equal(output.customClaims.__proto__[marker], true);
    assert.equal(Object.getPrototypeOf(output.customClaims), Object.prototype);
  }
  const constructorClaim = new UserRecord({localId: 'claims', customAttributes: '{"constructor":null,"roles":["teacher"]}'});
  const serialized = constructorClaim.toJSON();
  serialized.customClaims.roles.push('changed');
  assert.equal(constructorClaim.customClaims.roles.length, vpm ? 1 : 2);
  const factor = new TotpMultiFactorInfo({mfaEnrollmentId: 'totp', totpInfo: {nested: {value: 1}}});
  const factorJSON = factor.toJSON(); factorJSON.totpInfo.nested.value = 2;
  assert.equal(factor.totpInfo.nested.value, vpm ? 1 : 2);
  // Claim objects can be mutated by callers; serialization must still be
  // detached and have a defined failure for cycles, without recursion limits.
  const deep = new UserRecord({localId: 'deep', customAttributes: '{}'});
  let cursor = deep.customClaims;
  for (let i = 0; i < 20000; i++) cursor = cursor.next = {};
  cursor.leaf = true;
  if (vpm) {
    let copy = deep.toJSON().customClaims;
    for (let i = 0; i < 20000; i++) copy = copy.next;
    assert.equal(copy.leaf, true);
    copy.leaf = false; assert.equal(cursor.leaf, true);
    const cycle = new UserRecord({localId: 'cycle', customAttributes: '{}'});
    cycle.customClaims.self = cycle.customClaims;
    assert.throws(() => cycle.toJSON(), /User record data must not contain cycles/);
  } else if (!process.versions.bun) assert.throws(() => deep.toJSON(), RangeError);
  else {
    // JavaScriptCore's recursion limit differs by platform and build. The
    // Node control reproduces the stack limit; VPM must handle this depth on both.
    try {deep.toJSON();} catch (error) {assert.ok(error instanceof RangeError);}
  }
  process.stdout.write(JSON.stringify(outcomes));
}
