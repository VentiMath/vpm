'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    const outcomes = [];
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        outcomes.push(JSON.parse(run.stdout));
    }
    assert.deepEqual(outcomes[1], outcomes[0]);
    console.log(`Messaging: ${outcomes[0].length} normal outcomes match; ownership, sparse batches, project identity/discovery and session lifetime controls pass.`);
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const root = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {EventEmitter} = require('node:events');
    const http2 = require('node:http2'), sessions = [];
    http2.connect = () => {
        const session = new EventEmitter(); session.closed = false; session.closes = 0;
        session.close = () => {session.closed = true; session.closes++;};
        sessions.push(session); return session;
    };
    const {Messaging} = require(path.join(root, 'lib/messaging/messaging.js'));
    const utils = require(path.join(root, 'lib/utils/index.js'));
    const discover = utils.findProjectId;
    const create = (legacy = true, project = 'fixture-project') => {
        const service = new Messaging({options: {projectId: project}}), log = [];
        service.useLegacyTransport = legacy;
        const record = (_host, url, request) => {log.push({url, request}); return request.message.token || request.message.fid || request.message.topic || 'condition';};
        service.messagingRequestHandler.invokeRequestHandler = async (...args) => ({name: `messages/${record(...args)}`});
        const batch = async (...args) => {
            const recipient = record(...args);
            return recipient === 'stale' ? {success: false, error: {code: 'messaging/registration-token-not-registered'}}
                : {success: true, messageId: `messages/${recipient}`};
        };
        service.messagingRequestHandler.invokeHttpRequestHandlerForSendResponse = batch;
        service.messagingRequestHandler.invokeHttp2RequestHandlerForSendResponse = batch;
        return {service, log};
    };
    const normal = [];
    for (const legacy of [true, false]) for (const dryRun of [undefined, false, true]) {
        for (const target of [{tokens: ['one', 'stale', 'three']}, {fids: ['one', 'two']}, {tokens: ['one'], fids: ['two']}]) {
            const {service, log} = create(legacy);
            const input = {...target, notification: {title: 'Reminder', body: 'Practice'}, data: {receiptId: 'receipt-1', itemId: 'mail-1'}, apns: {payload: {aps: {sound: 'default'}}}};
            const before = JSON.stringify(input);
            const response = await service.sendEachForMulticast(input, dryRun);
            assert.equal(JSON.stringify(input), before);
            normal.push({response, log});
        }
        const {service, log} = create(legacy);
        normal.push({response: await service.send({topic: '/topics/practice', android: {ttl: 100}, notification: {title: 'Practice'}}, dryRun), log});
    }
    assert.ok(sessions.every(session => session.closed && session.closes === 1));

    // Own constructor properties must not bypass the message snapshot.
    {
        const {service, log} = create();
        const input = {constructor: null, token: 'one', android: {ttl: 100}};
        let release;
        service.getUrlPath = () => new Promise(resolve => {release = resolve;});
        const pending = service.send(input);
        input.token = 'changed';
        release('/v1/projects/fixture/messages:send');
        await pending;
        assert.equal(log[0].request.message.token, original ? 'changed' : 'one');
        assert.equal(input.android.ttl, original ? '0.100000000s' : 100);
    }
    // Null-prototype JSON records must be detached before schema normalization.
    {
        const {service} = create();
        const input = Object.assign(Object.create(null), {token: 'one', android: {ttl: 100}});
        await service.send(input);
        assert.equal(input.android.ttl, original ? '0.100000000s' : 100);
    }
    // A prototype-named own field remains data, never a prototype write.
    {
        const {service, log} = create();
        const input = JSON.parse('{"token":"one","__proto__":{"vpmMessageProbe":"owned"}}');
        try {
            await service.send(input);
            assert.equal(Object.prototype.vpmMessageProbe, original ? 'owned' : undefined);
            assert.equal(Object.hasOwn(log[0].request.message, '__proto__'), !original);
        } finally {delete Object.prototype.vpmMessageProbe;}
    }
    // Sparse input represents invalid recipients; it must not crash aggregation.
    {
        const {service} = create();
        const messages = [{token: 'one'}, , {token: 'three'}];
        if (original) await assert.rejects(service.sendEach(messages), TypeError);
        else {
            const result = await service.sendEach(messages);
            assert.equal(result.successCount, 2); assert.equal(result.failureCount, 1);
            assert.equal(result.responses[1].error.code, 'messaging/invalid-payload');
        }
    }
    // Pending discovery is shared, and a failed lookup permits another attempt.
    {
        let reads = 0, release;
        const gate = new Promise(resolve => {release = resolve;});
        utils.findProjectId = () => {reads++; return gate;};
        const {service} = create();
        const pending = [service.send({token: 'one'}), service.send({token: 'two'}), service.send({token: 'three'})];
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(reads, original ? 3 : 1);
        release('fixture'); await Promise.all(pending);
        let attempts = 0;
        utils.findProjectId = async () => {if (++attempts === 1) throw Error('lookup failed'); return 'recovered';};
        const retry = create().service;
        await assert.rejects(retry.send({token: 'one'}), /lookup failed/);
        assert.equal(await retry.send({token: 'two'}), 'messages/two');
        assert.equal(attempts, 2);
        utils.findProjectId = discover;
    }
    for (const failure of ['project', 'validation']) {
        const {service} = create(false);
        const before = sessions.length;
        if (failure === 'project') {
            service.getUrlPath = async () => {throw Error('project unavailable');};
            await assert.rejects(service.sendEach([{token: 'one'}]), /project unavailable/);
        } else {
            const result = await service.sendEach([{}, {}]);
            assert.equal(result.failureCount, 2);
        }
        assert.equal(sessions.length - before, original ? 1 : 0);
        assert.ok(sessions.every(session => session.closed));
    }
    // Resource identity cannot introduce new path segments or query strings.
    {
        const {service, log} = create(true, 'project/other?route=wrong');
        await service.send({token: 'one'});
        assert.equal(log[0].url, original ? '/v1/projects/project/other?route=wrong/messages:send'
            : '/v1/projects/project%2Fother%3Froute%3Dwrong/messages:send');
        if (!original) for (const id of ['.', '..', '\ud800']) {
            await assert.rejects(create(true, id).service.send({token: 'one'}), error => error.code === 'messaging/invalid-argument');
        }
    }
    // Completion order can differ from recipient order, including rejection.
    {
        const {service} = create(false), pending = [];
        service.messagingRequestHandler.invokeHttp2RequestHandlerForSendResponse = (_host, _path, request) =>
            new Promise((resolve, reject) => pending.push({resolve, reject, token: request.message.token}));
        const resultPromise = service.sendEach([{token: 'one'}, {token: 'two'}, {token: 'three'}]);
        await new Promise(resolve => setImmediate(resolve));
        pending[2].resolve({success: true, messageId: 'three'});
        pending[1].reject(Error('unavailable'));
        pending[0].resolve({success: true, messageId: 'one'});
        const result = await resultPromise;
        assert.equal(result.successCount, 2); assert.equal(result.failureCount, 1);
        assert.equal(result.responses[0].messageId, 'one'); assert.equal(result.responses[2].messageId, 'three');
        assert.equal(result.responses[1].error.message, 'unavailable');
        assert.ok(sessions.every(session => session.closed && session.closes === 1));
    }
    if (!original) {
        const {service, log} = create();
        const input = {token: 'one', custom: {}};
        let current = input.custom;
        for (let i = 0; i < 5000; i++) current = current.next = {};
        current.leaf = 'captured';
        await service.send(input);
        current.leaf = 'changed';
        let copied = log[0].request.message.custom;
        for (let i = 0; i < 5000; i++) copied = copied.next;
        assert.equal(copied.leaf, 'captured');
        const cycle = {token: 'one'}; cycle.custom = cycle;
        assert.throws(() => service.send(cycle), /Message payload must not contain cycles/);
        // This probes snapshot depth only; real FCM message-size limits and
        // JSON serialization still apply to actual network requests.
    }
    process.stdout.write(JSON.stringify(normal));
})().catch(error => {console.error(error); process.exitCode = 1;});
