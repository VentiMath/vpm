'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    const results = [];
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        results.push(JSON.parse(run.stdout));
    }
    assert.deepEqual(results[1], results[0]);
    console.log(`HTTP response controls: ${results[0].length} normal/wire outcomes match; captured data, detached headers, private parsing state and native error subclasses verified.`);
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const directory = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {RequestClient, RequestResponseError, HttpClient} = require(path.join(directory, 'lib/utils/api-request.js'));
    const client = new RequestClient(null), results = [];
    const project = raw => client.createRequestResponse(raw);
    const summarize = response => {
        const common = {status: response.status, text: response.text, headers: response.headers, json: response.isJson()};
        if (common.json) {
            common.data = response.data;
            assert.equal(response.data, response.data, 'parsed object identity');
        } else {
            let first, second;
            try {response.data;} catch (error) {first = error;}
            try {response.data;} catch (error) {second = error;}
            assert.notEqual(first, second, 'each access creates its own diagnostic');
            assert.equal(first.cause, second.cause, 'parse failure remains the same cause');
            assert.equal(first.httpResponse.data, response.text);
            assert.equal(first.httpResponse.status, response.status);
            common.error = {code: first.code, message: first.message, cause: first.cause?.code || first.cause?.name};
        }
        return common;
    };
    const bodies = ['{"user":"ada","roles":["teacher"]}', 'null', 'false', '0', '""', '[]',
        '{"__proto__":{"literal":true},"constructor":"data"}', '', ' ', '{broken', 'undefined', '\ufeff{"ok":true}'];
    const config = {method: 'GET', url: 'https://example.test/'};
    for (const data of bodies) {
        const response = project({status: 200, headers: {'content-type': 'text/plain'}, data, config});
        assert.equal(response.config, config, 'diagnostic request reference');
        results.push(summarize(response));
    }
    let reads = 0;
    const changing = project({status: 200, headers: {}, get data() {return JSON.stringify({read: ++reads});}});
    assert.equal(reads, original ? 3 : 1);
    assert.equal(changing.text, '{"read":1}');
    assert.equal(changing.data.read, original ? 3 : 1);

    const headers = {'x-request-id': 'before', 'set-cookie': ['first']};
    Object.defineProperty(headers, '__proto__', {value: 'literal', enumerable: true});
    const detached = project({status: 200, headers, data: '{"owned":true}'});
    headers['x-request-id'] = 'after'; headers['set-cookie'].push('later');
    assert.equal(detached.headers['x-request-id'], original ? 'after' : 'before');
    assert.deepEqual(detached.headers['set-cookie'], original ? ['first', 'later'] : ['first']);
    detached.headers['set-cookie'].push('response');
    assert.equal(headers['set-cookie'].includes('response'), original);
    assert.equal(Object.hasOwn(detached.headers, '__proto__'), true);
    assert.equal(detached.headers.__proto__, 'literal');
    assert.equal(Object.getPrototypeOf(detached.headers), Object.prototype);
    detached.parsedData = {forged: true};
    assert.deepEqual(detached.data, original ? {forged: true} : {owned: true});
    const invalid = project({status: 502, headers: {}, data: '<error>'});
    invalid.parsedData = {forged: true}; invalid.parseError = undefined;
    assert.equal(invalid.isJson(), original);
    if (!original) assert.throws(() => invalid.data, error => error.code === 'app/unable-to-parse-response' && error.cause instanceof SyntaxError);

    class SpecificFailure extends RequestResponseError {kind() {return 'specific';}}
    const failure = new SpecificFailure(detached);
    assert.equal(failure instanceof SpecificFailure, !original);
    assert.ok(failure instanceof RequestResponseError && failure instanceof Error);
    assert.equal(failure.response, detached);
    assert.equal(failure.message, 'Server responded with status 200.');
    if (!original) assert.equal(failure.kind(), 'specific');

    const http = require('node:http');
    const server = http.createServer((request, response) => {
        const index = Number(request.url.slice(1));
        response.writeHead(index % 2 ? 400 : 200, {'content-type': 'application/json', 'set-cookie': ['one', 'two'], date: 'Sun, 01 Nov 2026 00:00:00 GMT'});
        response.end(bodies[index]);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const httpClient = new HttpClient(null);
        for (let i = 0; i < bodies.length; i++) {
            let response;
            try {response = await httpClient.send({method: 'GET', url: `http://127.0.0.1:${server.address().port}/${i}`});}
            catch (error) {assert.ok(error instanceof RequestResponseError);response = error.response;}
            const summary = summarize(response);
            // Connection reuse policy belongs to the transport, not projection.
            delete summary.headers.connection; delete summary.headers['keep-alive']; delete summary.headers['transfer-encoding'];
            results.push(summary);
        }
    } finally {server.closeAllConnections();await new Promise(resolve => server.close(resolve));}
    process.stdout.write(JSON.stringify(results));
})().catch(error => {console.error(error);process.exitCode = 1;});
