'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const {spawnSync} = require('node:child_process');
if (!process.argv[2]) {
    for (const variant of ['upstream', 'vpm']) {
        const result = spawnSync(process.execPath, [__filename, variant], {encoding: 'utf8', timeout: 10000});
        assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    console.log('HTTP/2 session generations: isolated diagnostics, detached error arrays, destroyed-session recovery and retry pass.');
} else {
    const vpm = process.argv[2] === 'vpm';
    const http2 = require('node:http2'), {EventEmitter} = require('node:events');
    let fail = false, created = 0;
    http2.connect = (_url, options) => {
        if (fail) {fail = false; throw Error('connect failed');}
        assert.deepEqual(options, {peerMaxConcurrentStreams: 100, ALPNProtocols: ['h2']});
        const session = new EventEmitter();
        Object.assign(session, {closed: false, destroyed: false, closeCalls: 0, id: ++created});
        session.close = () => {session.closeCalls++; session.closed = true;};
        return session;
    };
    const root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
    const {Http2SessionHandler} = require(root + '/lib/utils/api-request');
    const owner = new Http2SessionHandler('https://example.test'), first = owner.session;
    assert.equal(owner.createSession('https://example.test'), first);
    const failure = Object.assign(Error('first failure'), {code: 'TEST'});
    first.emit('error', failure);
    assert.equal(owner.getErrors()[0].message, 'Session error while making requests: TEST - first failure');
    assert.equal(owner.getErrors()[0].cause, failure);
    owner.getErrors().length = 0;
    assert.equal(owner.getErrors().length, vpm ? 1 : 0);
    owner.close();
    const second = owner.createSession('https://example.test');
    assert.notEqual(second, first);
    first.emit('error', Error('late old error'));
    first.emit('goaway', 1, 2, Buffer.from('old'));
    assert.equal(owner.getErrors().length, vpm ? 0 : 2);
    second.emit('error', {name: 'AggregateError', code: 'TEST', errors: [{message: 'one'}, {message: 'two'}]});
    assert.equal(owner.getErrors().at(-1).message, 'Session error while making requests: TEST - AggregateError: [one, two]');
    second.emit('goaway', 1, 2, Buffer.from('current'));
    assert.equal(owner.getErrors().at(-1).message, 'Error while making requests: GOAWAY - current, Error code: 1');
    second.destroyed = true;
    assert.equal(owner.isCurrentSessionClosed, vpm);
    const recovered = owner.createSession('https://example.test');
    assert.equal(recovered === second, !vpm);
    owner.close(); owner.close();
    assert.equal(recovered.closeCalls, vpm ? 1 : 2);
    recovered.emit('error', Error('before failed connect'));
    const previous = owner.getErrors().length;
    fail = true;
    assert.throws(() => owner.createSession('https://example.test'), /connect failed/);
    assert.equal(owner.getErrors().length, vpm ? previous : 0);
    assert.notEqual(owner.createSession('https://example.test'), recovered);
    assert.deepEqual(owner.getErrors(), []);
}
