'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');

if (process.argv.includes('--server')) server().catch(fail);
else if (process.argv.includes('--child')) child(process.argv.at(-1) === 'upstream').catch(fail);
else (async () => {
    const worker = spawn('node', [__filename, '--server'], {stdio: ['pipe', 'pipe', 'inherit']});
    try {
        const lines = require('node:readline').createInterface({input: worker.stdout});
        const [line] = await once(lines, 'line'); lines.close();
        const addresses = JSON.parse(line); assert.equal(addresses.node.split('.')[0], '24');
        const normal = [];
        for (const variant of ['upstream', 'vpm']) {
            const run = spawnSync(process.execPath, [__filename, '--child', variant], {
                encoding: 'utf8', timeout: 45000, env: {...process.env, VPM_MESSAGING_WIRE: line},
            });
            assert.equal(run.status, 0, run.stderr || run.stdout);
            normal.push(JSON.parse(run.stdout));
        }
        assert.deepEqual(normal[1], normal[0]);
        console.log(`Messaging response: ${normal[0].length} normal projections match; malformed/prototype errors, false-success rejection and real HTTP/1 + HTTP/2 ordered batches pass.`);
    } finally {const exit = once(worker, 'exit'); worker.stdin.end(); await exit;}
})().catch(fail);
function fail(error) {console.error(error); process.exitCode = 1;}

async function server() {
    const http = require('node:http'), http2 = require('node:http2');
    const sessions = new Set();
    const respond = (message, done) => {
        const token = message.token;
        const fixtures = {
            stale: [404, {error: {status: 'NOT_FOUND', message: 'Device gone', details: [{'@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED'}]}}],
            'false-success': [200, {error: {status: 'UNREGISTERED', message: 'Device gone'}}],
            empty: [200, {}],
            'null-error': [200, {error: null}],
            'bad-details': [400, {error: {details: [null], status: 'INVALID_ARGUMENT', message: 'Bad request'}}],
            prototype: [400, {error: {status: 'constructor'}}],
        };
        const [status, data] = fixtures[token] || [200, {name: `projects/fixture/messages/${token}`}];
        setTimeout(() => done(status, JSON.stringify(data)), token === 'slow' ? 25 : 1);
    };
    const consume = (stream, headers, done) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => {
            try {
                assert.equal(headers.authorization, 'Bearer fixture-token');
                const body = JSON.parse(Buffer.concat(chunks));
                assert.equal(body.message.notification.title, 'Reminder');
                respond(body.message, done);
            } catch (error) {console.error(error); done(400, JSON.stringify({error: {status: 'INVALID_ARGUMENT', message: error.message}}));}
        });
    };
    const one = http.createServer((req, res) => {
        assert.equal(req.method, 'POST'); assert.equal(req.url, '/v1/projects/fixture/messages:send');
        consume(req, req.headers, (status, data) => {res.writeHead(status, {'content-type': 'application/json'});res.end(data);});
    });
    const two = http2.createServer();
    two.on('session', session => {sessions.add(session);session.once('close', () => sessions.delete(session));});
    two.on('stream', (stream, headers) => {
        assert.equal(headers[':method'], 'POST');assert.equal(headers[':path'], '/v1/projects/fixture/messages:send');
        consume(stream, headers, (status, data) => {stream.respond({':status': status, 'content-type': 'application/json'});stream.end(data);});
    });
    one.listen(0, '127.0.0.1'); two.listen(0, '127.0.0.1');
    await Promise.all([once(one, 'listening'), once(two, 'listening')]);
    console.log(JSON.stringify({one: one.address().port, two: two.address().port, node: process.versions.node}));
    process.stdin.resume(); await once(process.stdin, 'end');
    one.closeAllConnections();for (const session of sessions) session.destroy();
    await Promise.all([new Promise(resolve => one.close(resolve)), new Promise(resolve => two.close(resolve))]);
}

async function child(original) {
    const root = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {FirebaseMessagingRequestHandler: Handler} = require(path.join(root, 'lib/messaging/messaging-api-request-internal.js'));
    const {FirebaseMessagingError} = require(path.join(root, 'lib/messaging/error.js'));
    const errors = require(path.join(root, 'lib/messaging/messaging-errors-internal.js'));
    const {RequestResponseError} = require(path.join(root, 'lib/utils/api-request.js'));
    const response = (status, data, json = true, config) => ({status, data, text: json ? JSON.stringify(data) : data,
        headers: {'x-request-id': 'fixture'}, config, isJson: () => json});
    const normal = [], project = result => ({success: result.success, messageId: result.messageId,
        error: result.error && {code: result.error.code, message: result.error.message, httpResponse: result.error.httpResponse}});
    const handler = new Handler({options: {}});
    const codes = ['INVALID_ARGUMENT', 'UNREGISTERED', 'NOT_FOUND', 'QUOTA_EXCEEDED', 'SENDER_ID_MISMATCH', 'UNAVAILABLE', 'INTERNAL', 'new-code'];
    for (const code of codes) for (const detail of [false, true]) {
        const envelope = {error: {status: code, message: 'wire message', ...(detail ? {details: [{'@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: code}]} : {})}};
        const result = handler.buildSendResponse(response(400, envelope));
        assert.equal(result.success, false);assert.ok(result.error instanceof FirebaseMessagingError);
        assert.ok(result.error.cause instanceof RequestResponseError);normal.push(project(result));
    }
    for (const status of [400, 401, 403, 404, 429, 500, 503, 599]) normal.push(project(handler.buildSendResponse(response(status, 'raw failure', false))));
    normal.push(project(handler.buildSendResponse(response(200, {name: 'messages/one'}))));
    for (const data of [{message: {fid: 'installation'}}, JSON.stringify({message: {fid: 'installation'}}), Buffer.from('{"message":{"fid":"installation"}}')]) {
        const result = handler.buildSendResponse(response(404, {error: {status: 'NOT_FOUND'}}, true, {data}));
        assert.equal(result.error.code, 'messaging/installation-id-not-registered');normal.push(project(result));
    }
    for (const method of ['subscribeToTopic', 'unsubscribeFromTopic']) for (const json of [false, true]) {
        for (const status of [200, 400, 401, 404, 409, 429, 500, 503]) {
            normal.push(project(handler.buildTopicSubscriptionResponse(response(status, json ? {error: {status: 'NOT_FOUND', message: 'gone'}} : 'gone', json), method)));
        }
    }
    for (const data of [{error: null}, {error: {details: [null], status: 'INVALID_ARGUMENT'}}, {error: {status: 'constructor'}}, {error: {status: '__proto__'}}, {error: {status: 'toString'}}]) {
        const run = () => errors.createFirebaseError(new RequestResponseError(response(400, data)));
        if (original) assert.throws(run, TypeError);
        else assert.ok(run() instanceof FirebaseMessagingError);
    }
    for (const data of [{}, {name: ''}, {name: 7}, {error: {status: 'UNREGISTERED'}}, {error: null}]) {
        const result = handler.buildSendResponse(response(200, data));
        assert.equal(result.success, original);
        if (!original) assert.ok(result.error instanceof FirebaseMessagingError);
    }
    for (const data of [null, false, 7, 'text', [], {error: 0}, {error: {details: [null, 3, false, {}], status: 'INTERNAL'}}]) {
        if (!original) assert.ok(handler.buildSendResponse(response(400, data)).error instanceof FirebaseMessagingError);
    }
    for (const key of ['constructor', '__proto__', 'toString']) {
        if (original) assert.throws(() => FirebaseMessagingError.fromTopicManagementServerError(key), TypeError);
        else assert.equal(FirebaseMessagingError.fromTopicManagementServerError(key).code, 'messaging/unknown-error');
    }
    // Generic topic response bodies do not need a message identifier.
    handler.httpClient.send = async () => response(200, {results: [{}]});
    normal.push(await handler.invokeRequestHandler('iid.googleapis.com', '/iid/v1:batchAdd', {}));
    const networkError = new Error('synthetic I/O failure');
    handler.httpClient.send = handler.http2Client.send = async () => {throw networkError;};
    await assert.rejects(handler.invokeHttpRequestHandlerForSendResponse('host', '/path', {}), e => e === networkError);
    await assert.rejects(handler.invokeHttp2RequestHandlerForSendResponse('host', '/path', {}, {}), e => e === networkError);

    const addresses = JSON.parse(process.env.VPM_MESSAGING_WIRE), http2 = require('node:http2');
    const connect = http2.connect;
    http2.connect = (_authority, options, listener) => {
        const session = connect(`http://127.0.0.1:${addresses.two}`, {...options, ALPNProtocols: undefined}, listener);
        const send = session.request.bind(session);
        // Original sends a colon after https; normalize only that already-known
        // upstream defect, identically to the separate actual-caller fixture.
        session.request = (headers, ...args) => send({...headers, ':scheme': String(headers[':scheme']).replace(/:$/, '')}, ...args);
        return session;
    };
    const {initializeApp, deleteApp} = require(path.join(root, 'lib/app/index.js'));
    const {getMessaging} = require(path.join(root, 'lib/messaging/index.js'));
    for (const legacy of [true, false]) {
        const app = initializeApp({projectId: 'fixture', credential: {getAccessToken: async () => ({access_token: 'fixture-token', expires_in: 3600})}}, 'response-' + legacy);
        try {
            const service = getMessaging(app);
            if (legacy) service.enableLegacyHttpTransport();
            const client = service.messagingRequestHandler.httpClient, send = client.send.bind(client);
            client.send = config => send({...config, url: config.url.replace('https://fcm.googleapis.com', `http://127.0.0.1:${addresses.one}`)});
            const result = await service.sendEachForMulticast({tokens: ['slow', 'stale', 'fast'], notification: {title: 'Reminder'}});
            assert.equal(result.successCount, 2);assert.equal(result.failureCount, 1);
            assert.equal(result.responses[0].messageId, 'projects/fixture/messages/slow');
            assert.equal(result.responses[1].error.code, 'messaging/registration-token-not-registered');
            normal.push({successCount: result.successCount, failureCount: result.failureCount, responses: result.responses.map(r => ({success: r.success, messageId: r.messageId, code: r.error?.code}))});
            const malformed = await service.sendEachForMulticast({tokens: ['false-success', 'empty', 'null-error', 'bad-details', 'prototype'], notification: {title: 'Reminder'}});
            assert.equal(malformed.successCount, original ? 3 : 0);
            assert.equal(malformed.failureCount, original ? 2 : 5);
            if (!original) {
                assert.ok(malformed.responses.every(r => r.error instanceof FirebaseMessagingError));
                assert.equal(malformed.responses[0].error.code, 'messaging/registration-token-not-registered');
                assert.equal(malformed.responses[3].error.code, 'messaging/invalid-argument');
            }
            // Preserve the single-send adapter's legacy empty-name result;
            // only per-device batch results count delivery in VentiMath.
            assert.equal(await service.send({token: 'empty', notification: {title: 'Reminder'}}), undefined);
        } finally {await deleteApp(app);}
    }
    process.stdout.write(JSON.stringify(normal));
}
