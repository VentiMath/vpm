'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {spawn} = require('node:child_process'), {once} = require('node:events'), readline = require('node:readline');
const root = path.resolve(__dirname, '..');
const roots = {upstream: path.resolve(root, '../../scripts/storage-conformance/node_modules/@google-cloud/storage'), vpm: root};
const certificate = require('../../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json');
const credentials = {client_email: certificate.client_email, private_key: certificate.private_key};
const body = Buffer.alloc(64 * 1024, 97), crc32c = 'TpXtPw==';
let selectedRoot, server;
const library = directory => {selectedRoot = directory;return {...require(directory), HashStreamValidator: require(path.join(directory, directory === root ? 'lib/hash-stream-validator.js' : 'build/cjs/src/hash-stream-validator.js')).HashStreamValidator};};
const make = source => directory => new Function('lib', 'env', source)(library(directory), {
    credentials, body, crc32c, endpoint: process.env.VPM_STORAGE_BENCH_ORIGIN,
    start: new Date(Number(process.env.VPM_STORAGE_BENCH_START)),
    expires: new Date(Number(process.env.VPM_STORAGE_BENCH_START) + 3600000),
});
const connection = 'const storage = new lib.Storage({projectId: "fixture-project", apiEndpoint: env.endpoint, useAuthWithCustomEndpoint: false, retryOptions: {autoRetry: false}}); ';
const cases = [
    {name: 'Storage construction', make: make('return () => new lib.Storage({projectId: "fixture-project"});'), validate: value => assert.equal(value.projectId, 'fixture-project')},
    {name: 'custom endpoint construction', make: make('return () => new lib.Storage({projectId: "fixture-project", apiEndpoint: "http://127.0.0.1:9199"});'), validate: value => assert.equal(value.apiEndpoint, 'http://127.0.0.1:9199')},
    {name: 'bucket + file handles', make: make('const storage = new lib.Storage({projectId: "fixture-project"}); return () => storage.bucket("fixture").file("nested/fixture.pdf");'), validate: value => assert.equal(value.name, 'nested/fixture.pdf')},
    ...['v2', 'v4'].map(version => ({name: version + ' signed URL / RSA fixture', async: true,
        make: make('const file = new lib.Storage({projectId: "fixture-project", credentials: env.credentials}).bucket("fixture").file("nested/fixture.pdf"); return () => file.getSignedUrl({action: "read", version: ' + JSON.stringify(version) + ', expires: env.expires, accessibleAt: env.start});'),
        validate: value => assert.ok(new URL(value[0]).searchParams.has(version === 'v2' ? 'Signature' : 'X-Goog-Signature'))})),
    {name: 'CRC32C / 64KiB', make: make('return () => {const hash = new lib.CRC32C(); hash.update(env.body); return hash.toString();};'), validate: value => assert.equal(value, crc32c)},
    {name: 'CRC32C / 64B', make: make('const bytes = env.body.subarray(0, 64); return () => {const hash = new lib.CRC32C(); hash.update(bytes); return hash.toString();};'), validate: value => assert.equal(value, 'N67uMw==')},
    {name: 'CRC32C / 64KiB in 1KiB chunks', make: make('const chunks = Array.from({length: 64}, (_, i) => env.body.subarray(i * 1024, (i + 1) * 1024)); return () => {const hash = new lib.CRC32C(); for (const chunk of chunks) hash.update(chunk); return hash.toString();};'), validate: value => assert.equal(value, crc32c)},
    {name: 'CRC32C / resumed 32KiB', make: make('const bytes = env.body.subarray(32768); return () => {const hash = lib.CRC32C.from("QEaKDQ=="); hash.update(bytes); return hash.toString();};'), validate: value => assert.equal(value, crc32c)},
    ...['md5', 'crc32c', 'both'].map(mode => ({name: 'hash stream / 64KiB / ' + mode, async: true,
        make: make('return () => new Promise((resolve, reject) => {const stream = new lib.HashStreamValidator({md5: ' + (mode !== 'crc32c') + ', crc32c: ' + (mode !== 'md5') + ', updateHashesOnly: true}); stream.resume(); stream.once("error", reject); stream.once("end", () => resolve({md5: stream.md5Digest, crc32c: stream.crc32c})); stream.end(env.body);});'),
        validate: value => {if(mode !== 'md5') assert.equal(value.crc32c, crc32c); if(mode !== 'crc32c') assert.equal(value.md5, 'LWGqVLWMLpRAP7CSw9vAJw==');}})),
    {name: 'HTTP object metadata', async: true, make: make(connection + 'const file = storage.bucket("fixture").file("fixture.pdf"); return () => file.getMetadata();'), validate: value => assert.equal(value[0].name, 'fixture.pdf')},
    {name: 'HTTP automatic listing / one page', async: true, make: make(connection + 'const bucket = storage.bucket("fixture"); return () => bucket.getFiles({prefix: "fixture"});'), validate: value => {assert.equal(value[0].length, 1);assert.equal(value[0][0].name, 'fixture.pdf');}},
    {name: 'HTTP multipart upload / 64KiB + CRC32C', async: true, make: make(connection + 'const file = storage.bucket("fixture").file("fixture.pdf"); return async () => {await file.save(env.body, {resumable: false}); return file.metadata;};'), validate: value => assert.equal(value.crc32c, crc32c)},
    {name: 'HTTP download / 64KiB + CRC32C', async: true, make: make(connection + 'const file = storage.bucket("fixture").file("fixture.pdf"); return () => file.download();'), validate: value => assert.deepEqual(value[0], body)},
];
const envNames = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'GOOGLE_SDK_NODE_LOGGING', 'STORAGE_EMULATOR_HOST'];
const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
for (const name of envNames) delete process.env[name];
// Keep warning I/O outside timing for both implementations' download pipelines.
require('node:events').defaultMaxListeners = 32;
async function cleanup() {
    if (selectedRoot === roots.vpm) require('vteeny-request').teenyRequest.close();
    else if (selectedRoot) {
        const {pool} = require('../../../scripts/storage-conformance/node_modules/teeny-request/build/src/agents');
        for (const agent of pool.values()) agent.destroy();pool.clear();
    }
    if (server) {const ended = once(server, 'exit');server.stdin.end();await ended;}
    for (const name of envNames) if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
}
(async () => {
    if (!process.env.VPM_BENCH_WORKER) {
        server = spawn('node', [path.join(__dirname, 'http-server.cjs')], {stdio: ['pipe', 'pipe', 'inherit']});
        const lines = readline.createInterface({input: server.stdout});
        const [line] = await once(lines, 'line');lines.close();
        const address = JSON.parse(line);assert.equal(address.node.split('.')[0], '24');
        process.env.VPM_STORAGE_BENCH_ORIGIN = 'http://127.0.0.1:' + address.port;
        process.env.VPM_STORAGE_BENCH_START = String(Math.floor(Date.now() / 1000) * 1000);
    }
    const files = ['bench/compare.cjs', 'bench/http-server.cjs', '../../scripts/storage-conformance/package-lock.json',
        '../../scripts/storage-conformance/node_modules/@google-cloud/storage/package.json',
        '../../scripts/storage-conformance/node_modules/@google-cloud/storage/build/cjs/src',
        '../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json'];
    const seen = new Set();
    function sources(name) {
        if (seen.has(name)) return;seen.add(name);
        const directory = path.resolve(root, '..', name), manifest = require(path.join(directory, 'package.json'));
        for (const file of fs.readdirSync(directory, {recursive: true}))
            if (!/^(?:test|bench|node_modules)\//.test(file) && (/\.(?:js|cjs|mjs)$/.test(file) || file === 'package.json')) files.push(path.relative(root, path.join(directory, file)));
        for (const dependency of Object.keys({...manifest.dependencies, ...manifest.optionalDependencies})) sources(dependency);
    }
    sources('vgoogle-cloud-storage');
    await require('../../../scripts/bench-process.cjs').run({root, upstream: roots.upstream, vpm: roots.vpm, cases, files, cleanup, validationOnly: process.argv.includes('--validate')});
})().catch(async error => {console.error(error);if (server && !server.killed) server.kill();process.exitCode = 1;});
