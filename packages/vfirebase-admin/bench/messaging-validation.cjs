'use strict';
const path = require('node:path'), assert = require('node:assert/strict'), root = path.resolve(__dirname, '..');
const cases = [
  {name: 'application reminder payload', make: dir => {const {validateMessage} = require(path.join(dir, 'lib/messaging/messaging-internal'));
    return () => {const message = {token: 'recipient', notification: {title: 'Practice', body: 'Ready'}, data: {receiptId: 'receipt', itemId: 'item'}, apns: {payload: {aps: {sound: 'default'}}}}; validateMessage(message); return message;};},
    validate: value => {assert.equal(value.token, 'recipient'); assert.equal(value.apns.payload.aps.sound, 'default'); assert.equal(value.data.itemId, 'item');}},
  {name: 'Android topic normalization', make: dir => {const {validateMessage} = require(path.join(dir, 'lib/messaging/messaging-internal'));
    return () => {const message = {topic: '/topics/math', android: {ttl: 1500, collapseKey: 'practice', notification: {title: 'Practice', clickAction: 'OPEN', priority: 'high', color: '#123456'}}}; validateMessage(message); return message;};},
    validate: value => {assert.equal(value.topic, 'math'); assert.equal(value.android.ttl, '1.500000000s'); assert.equal(value.android.collapse_key, 'practice'); assert.equal(value.android.notification.notification_priority, 'PRIORITY_HIGH'); assert.equal(value.android.notification.click_action, 'OPEN');}},
];
require('../../../scripts/bench-process.cjs').run({root, upstream: path.resolve(root, '../../scripts/firebase-admin-conformance/node_modules/firebase-admin'), vpm: root, cases,
 files: ['package.json', 'lib/messaging/messaging-internal.js', 'lib/messaging/error.js', 'lib/utils/validator.js', 'bench/messaging-validation.cjs', '../../scripts/firebase-admin-conformance/package-lock.json', '../../scripts/firebase-admin-conformance/node_modules/firebase-admin'],
}).catch(error => {console.error(error); process.exitCode = 1;});
