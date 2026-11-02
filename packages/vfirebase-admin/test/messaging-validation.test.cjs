'use strict';
const test = require('node:test'), assert = require('node:assert/strict');

const {
  validateMessage
} = require('../lib/messaging/messaging-internal');

const {
  Messaging
} = require('../lib/messaging/messaging');

const invalid = fn => assert.throws(fn, error => error.code === 'messaging/invalid-payload');

test('all validation completes before any wire-field conversion', () => {
  const message = {
    topic: '/topics/math',

    android: {
      ttl: 100,
      collapseKey: 'key'
    },

    notification: {
      imageUrl: 'invalid'
    }
  };

  const before = structuredClone(message);
  invalid(() => validateMessage(message));
  assert.deepEqual(message, before);
});

test('nonfinite durations, invalid dates and scalar enums are structured SDK errors', () => {
  for (const value of [Infinity, -Infinity, NaN]) invalid(() => validateMessage({
    token: 'one',

    android: {
      ttl: value
    }
  }));

  invalid(() => validateMessage({
    token: 'one',

    android: {
      notification: {
        eventTimestamp: new Date(NaN)
      }
    }
  }));

  for (const field of ['priority', 'proxy', 'visibility']) invalid(() => validateMessage({
    token: 'one',

    android: {
      notification: {
        [field]: 42
      }
    }
  }));

  invalid(() => validateMessage({
    topic: 42
  }));
});

test('ambiguous SDK/wire names reject instead of overwriting request fields', () => {
  for (const android of [{
    collapseKey: 'sdk',
    collapse_key: 'wire'
  }, {
    notification: {
      clickAction: 'sdk',
      click_action: 'wire'
    }
  }, {
    notification: {
      lightSettings: {
        color: '#112233',
        lightOnDurationMillis: 1,
        light_on_duration: '2s',
        lightOffDurationMillis: 1
      }
    }
  }]) invalid(() => validateMessage({
    token: 'one',
    android
  }));
});

test('inherited targets are not a serializable message target', () => {
  invalid(() => validateMessage(Object.create({
    token: 'inherited'
  })));

  const message = Object.assign(Object.create(null), {
    token: 'one',

    data: Object.assign(Object.create(null), {
      constructor: 'literal',
      __proto__: 'data'
    })
  });

  validateMessage(message);
  assert.equal(message.token, 'one');
  assert.equal(message.data.constructor, 'literal');
});

test('APS wire values and localization remain compatible', () => {
  const message = {
    token: 'one',

    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          mutableContent: false,
          threadId: 'thread',

          sound: {
            name: 'default',
            critical: true,
            volume: .5
          },

          alert: {
            locKey: 'key',
            locArgs: ['x']
          }
        }
      }
    }
  };

  validateMessage(message);

  assert.deepEqual(message.apns.payload.aps, {
    'content-available': 1,
    'thread-id': 'thread',

    sound: {
      name: 'default',
      critical: 1,
      volume: .5
    },

    alert: {
      'loc-key': 'key',
      'loc-args': ['x']
    }
  });
});

test('fractional milliseconds and RGBA fields normalize without losing precision', () => {
  const message = {
    token: 'one',

    android: {
      ttl: 1005.125,

      notification: {
        vibrateTimingsMillis: [0, .5],

        lightSettings: {
          color: '#10203080',
          lightOnDurationMillis: 10,
          lightOffDurationMillis: 20
        }
      }
    }
  };

  validateMessage(message);
  assert.equal(message.android.ttl, '1.005125000s');
  assert.deepEqual(message.android.notification.vibrate_timings, ['0s', '0.000500000s']);
  assert.equal(message.android.notification.light_settings.color.alpha, 128 / 255);
});

test('actual reminder multicast plan preserves app inputs and ordered invalid results', async () => {
  const service = new Messaging({
    options: {
      projectId: 'fixture'
    }
  });

  service.useLegacyTransport = true;
  const requests = [];

  service.messagingRequestHandler.invokeHttpRequestHandlerForSendResponse = async (host, path, request) => {
    requests.push(request);

    return {
      success: true,
      messageId: request.message.token
    };
  };

  const input = {
    tokens: ['a', 'b'],

    notification: {
      title: 'Reminder',
      body: 'Practice'
    },

    data: {
      receiptId: 'receipt-1',
      itemId: 'mail-1'
    },

    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  const before = structuredClone(input), reply = await service.sendEachForMulticast(input);
  assert.equal(reply.successCount, 2);
  assert.deepEqual(input, before);
  assert.deepEqual(requests.map(r => r.message.token), ['a', 'b']);

  const batch = await service.sendEach([{
    token: 'good'
  }, {
    token: 'bad',

    android: {
      ttl: Infinity
    }
  }, {
    token: 'later'
  }]);

  assert.deepEqual(batch.responses.map(r => r.success), [true, false, true]);
  assert.equal(batch.responses[1].error.code, 'messaging/invalid-payload');
});
