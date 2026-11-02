'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const original = require('./node_modules/firebase-admin/lib/messaging/messaging-internal'), replacement = require('../../packages/vfirebase-admin/lib/messaging/messaging-internal');

// The control imports the original by its resolved file; it never sends a message.
const cases = [() => ({
  topic: 42
}), () => ({
  token: 'one',

  android: {
    ttl: Infinity
  }
}), () => ({
  token: 'one',

  android: {
    notification: {
      eventTimestamp: new Date(NaN)
    }
  }
}), () => ({
  token: 'one',

  android: {
    notification: {
      priority: 42
    }
  }
}), () => ({
  token: 'one',

  android: {
    collapseKey: 'sdk',
    collapse_key: 'wire'
  }
})];

const outcomes = [];

for (const make of cases) {
  const a = make(), b = make();
  let upstream;

  try {
    original.validateMessage(a);
    upstream = 'accepted';
  } catch (e) {
    upstream = e.name;
  }

  assert.throws(() => replacement.validateMessage(b), error => error.code === 'messaging/invalid-payload');
  outcomes.push(upstream);
}

assert.deepEqual(outcomes, ['TypeError', 'accepted', 'RangeError', 'TypeError', 'accepted']);

for (const implementation of [original, replacement]) {
  const input = {
    topic: '/topics/math',

    android: {
      ttl: 100
    },

    notification: {
      imageUrl: 'invalid'
    }
  };

  assert.throws(() => implementation.validateMessage(input));
  assert.equal(input.topic, implementation === original ? 'math' : '/topics/math');
  assert.equal(input.android.ttl, implementation === original ? '0.100000000s' : 100);
}

console.log(
  'Messaging schema controls: 5 original malformed outcomes and partial normalization reproduced; VPM rejects with SDK errors before normalization.'
);
