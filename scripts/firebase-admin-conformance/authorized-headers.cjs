'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        process.stdout.write(run.stdout);
    }
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const directory = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {HttpClient, Http2Client, AuthorizedHttpClient, AuthorizedHttp2Client} = require(path.join(directory, 'lib/utils/api-request.js'));
    const normalized = headers => Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
    const savedQuota = process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
    process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'environment-quota';
    try {
        for (const [Base, Authorized] of [[HttpClient, AuthorizedHttpClient], [Http2Client, AuthorizedHttp2Client]]) {
            const send = Base.prototype.send;
            Base.prototype.send = async request => request;
            try {
                let release;
                const token = new Promise(resolve => {release = resolve;});
                const app = {options: {}};
                const client = new Authorized(app); client.getToken = () => token;
                const headers = {Authorization: 'old-capitalized', authorization: 'stale', 'X-Goog-User-Project': 'caller-quota',
                    'x-goog-api-client': 'caller-metrics', 'X-Custom': 'before', 'X-Array': ['one']};
                Object.defineProperty(headers, '__proto__', {value: 'literal', enumerable: true});
                const request = {url: 'https://example.test/before', method: 'POST', headers, data: {owned: true}};
                const pending = client.send(request);
                headers['X-Custom'] = 'after'; headers['X-Array'].push('two'); request.url = 'https://example.test/after';
                release('fresh');
                const sent = await pending, values = normalized(sent.headers);
                assert.equal(values.authorization, original ? 'stale' : 'Bearer fresh');
                assert.equal(values['x-goog-user-project'], original ? 'environment-quota' : 'caller-quota');
                if (!original) assert.equal(values['x-goog-api-client'], 'caller-metrics');
                else assert.notEqual(values['x-goog-api-client'], 'caller-metrics');
                assert.equal(values['x-custom'], original ? 'after' : 'before');
                assert.deepEqual(values['x-array'], original ? ['one', 'two'] : ['one']);
                assert.equal(sent.url, original ? 'https://example.test/after' : 'https://example.test/before');
                assert.equal(Object.hasOwn(sent.headers, '__proto__'), !original);
                assert.equal(headers.Authorization, 'old-capitalized');
                assert.equal(headers.authorization, 'stale');

                delete process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
                const immediate = new Authorized(app); immediate.getToken = async () => 'fresh';
                const empty = await immediate.send({url: 'https://example.test/', headers: {'x-goog-user-project': ''}});
                assert.equal(empty.headers['x-goog-user-project'], '');
                process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'environment-quota';

                let deleted = false, finish;
                const deleting = new Authorized({get options() {if (deleted) throw Error('app deleted'); return {};}});
                deleting.getToken = () => new Promise(resolve => {finish = resolve;});
                const closing = deleting.send({url: 'https://example.test/'});
                deleted = true; finish('fresh');
                await assert.rejects(closing, /app deleted/);
            } finally {Base.prototype.send = send;}
        }

        const http = require('node:http');
        let observed;
        const server = http.createServer((request, response) => {observed = request.headers;response.end('{"ok":true}');});
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        try {
            const client = new AuthorizedHttpClient({options: {}}); client.getToken = async () => 'fresh';
            const result = await client.send({url: `http://127.0.0.1:${server.address().port}/`, headers: {
                Authorization: 'old-capitalized', authorization: 'stale', 'X-Goog-User-Project': 'caller-quota', 'x-goog-api-client': 'caller-metrics',
            }});
            assert.equal(result.data.ok, true);
            assert.equal(observed.authorization, original ? 'stale' : 'Bearer fresh');
            assert.equal(observed['x-goog-user-project'], original ? 'environment-quota' : 'caller-quota');
            assert.equal(observed['x-goog-api-client'] === 'caller-metrics', !original);
        } finally {server.closeAllConnections();await new Promise(resolve => server.close(resolve));}
    } finally {
        if (savedQuota === undefined) delete process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
        else process.env.GOOGLE_CLOUD_QUOTA_PROJECT = savedQuota;
    }
    console.log(`${original?'Upstream':'VPM'} authorization controls: case collisions, pending header/option mutations, explicit quota/metrics, prototype-named headers, deletion and actual HTTP pass.`);
})().catch(error => {console.error(error);process.exitCode = 1;});
