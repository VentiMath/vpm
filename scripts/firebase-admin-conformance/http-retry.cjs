'use strict';
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

if (!process.argv.includes('--child')) {
    for (const name of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', name], {encoding: 'utf8', timeout: 30000, env: {...process.env, TZ: 'America/Los_Angeles'}});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        process.stdout.write(run.stdout);
    }
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const root = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {RequestClient, HttpClient, defaultRetryConfig} = require(path.join(root, 'lib/utils/api-request.js'));
    const config = {maxRetries: 3, backOffFactor: 1, maxDelayInMillis: 60000, statusCodes: [503], ioErrorCodes: ['ECONNRESET']};
    const client = new RequestClient(config);
    config.statusCodes.push(429); config.ioErrorCodes.push('OTHER');
    assert.equal(client.isRetryEligible(0, {response: {status: 429}}), original);
    assert.equal(client.isRetryEligible(0, {code: 'OTHER'}), original);
    config.maxRetries = 0;
    assert.equal(client.isRetryEligible(0, {code: 'ECONNRESET'}), !original);

    for (const field of ['maxRetries', 'maxDelayInMillis', 'backOffFactor']) {
        const options = {...defaultRetryConfig(), [field]: Infinity};
        if (original) assert.doesNotThrow(() => new RequestClient(options));
        else assert.throws(() => new RequestClient(options), {code: 'app/invalid-argument'});
    }
    for (const field of ['maxRetries', 'maxDelayInMillis']) {
        if (original) assert.doesNotThrow(() => new RequestClient({...defaultRetryConfig(), [field]: 0.5}));
        else assert.throws(() => new RequestClient({...defaultRetryConfig(), [field]: 0.5}), {code: 'app/invalid-argument'});
    }
    assert.deepEqual(new RequestClient().retry, defaultRetryConfig());
    assert.equal(new RequestClient(null).isRetryEligible(0, {code: 'ECONNRESET'}), false);

    const defaults = defaultRetryConfig(), defaultClient = new RequestClient();
    defaults.statusCodes.push(429);
    assert.equal(defaultClient.isRetryEligible(0, {response: {status: 429}}), false);
    assert.equal(new RequestClient().isRetryEligible(0, {response: {status: 429}}), false);

    const policy = new RequestClient({...defaultRetryConfig(), backOffFactor: 1});
    for (const [header, old] of [['30junk', 30000], ['+30', 30000], ['0.5', 0], ['1e3', 1000], ['2026-11-01', 2026000], ['\n30', 30000]])
        assert.equal(policy.parseRetryAfterIntoMillis(header), original ? old : -1, JSON.stringify(header));
    assert.equal(policy.parseRetryAfterIntoMillis(' \t0030\t '), 30000);
    const response = headers => ({response: {status: 503, headers}});
    assert.deepEqual(policy.getRetryDelayMillis(1, response({'retry-after': '0'})), [original ? 2000 : 0, true]);
    assert.deepEqual(policy.getRetryDelayMillis(1, response({'Retry-After': '30'})), [original ? 2000 : 30000, true]);

    const now = Date.now;
    Date.now = () => Date.UTC(2026, 10, 1);
    try {
        for (const header of ['Sun, 01 Nov 2026 00:00:30 GMT', 'Sunday, 01-Nov-26 00:00:30 GMT', 'Sun Nov  1 00:00:30 2026'])
            assert.equal(policy.parseRetryAfterIntoMillis(header), original && header.startsWith('Sun Nov') ? Date.parse(header) - Date.now() : 30000);
        if (!original) {
            assert.equal(policy.parseRetryAfterIntoMillis('Fri, 31 Feb 2026 00:00:30 GMT'), -1);
            assert.equal(policy.parseRetryAfterIntoMillis('Sun, 01 Nov 2026 25:00:30 GMT'), -1);
            assert.equal(policy.parseRetryAfterIntoMillis('Sunday, 01-Nov-51 00:00:30 GMT'), Date.UTC(2051, 10, 1, 0, 0, 30) - Date.now());
            assert.equal(policy.parseRetryAfterIntoMillis('Sun, 01 Nov 2026 00:00:60 GMT'), 60000);
        }
    } finally { Date.now = now; }

    const setTimer = globalThis.setTimeout, segments = [];
    globalThis.setTimeout = (done, delay) => {segments.push(delay);queueMicrotask(done);};
    try { await policy.waitForRetry(0x80000010); }
    finally {globalThis.setTimeout = setTimer;}
    assert.deepEqual(segments, original ? [0x80000010] : [0x7fffffff, 17]);
    const zero = new RequestClient({maxRetries: 2000, maxDelayInMillis: 60000, backOffFactor: 0});
    assert.equal(Number.isNaN(zero.backOffDelayMillis(1100)), original);

    const http = require('node:http');
    let requests = 0;
    const server = http.createServer((request, response) => {
        requests++;
        if (requests === 1) response.writeHead(503, {'retry-after': '1junk'}).end('{}');
        else response.end('{"ok":true}');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const network = new HttpClient({...defaultRetryConfig(), backOffFactor: 0}), waits = [];
        network.waitForRetry = async delay => {waits.push(delay);};
        const result = await network.send({method: 'GET', url: `http://127.0.0.1:${server.address().port}/`});
        assert.equal(result.data.ok, true); assert.equal(requests, 2);
        assert.deepEqual(waits, [original ? 1000 : 0]);
    } finally {server.closeAllConnections();await new Promise(resolve => server.close(resolve));}
    console.log(`${original?'Upstream':'VPM'} retry controls: owned config, finite limits, strict delay grammar, HTTP dates, zero/cased headers, bounded timers and real HTTP retry pass.`);
})().catch(error => {console.error(error);process.exitCode = 1;});
