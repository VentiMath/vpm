'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const mode = process.argv[2];

if (mode === '--server') serve();
else if (!mode) {
    for (const kind of ['upstream', 'vpm']) {
        const child = spawnSync(process.execPath, [__filename, kind], {encoding: 'utf8', timeout: 60000});
        assert.equal(child.status, 0, child.stdout + child.stderr);
        process.stdout.write(child.stdout);
    }
} else main().catch(error => {console.error(error); process.exitCode = 1;});

function serve() {
    const http2 = require('node:http2'), zlib = require('node:zlib');
    const server = http2.createServer(), sessions = new Set(), attempts = new Map();
    server.on('session', session => {sessions.add(session); session.on('close', () => sessions.delete(session));});
    server.on('stream', (stream, headers) => {
        stream.on('error', () => {});
        const url = headers[':path']; let body = '';
        stream.on('data', chunk => {body += chunk;});
        stream.on('end', () => {
            if (url === '/no-headers') {stream.close(http2.constants.NGHTTP2_NO_ERROR); return;}
            if (url === '/reset') {
                stream.respond({':status': 200}); stream.write('partial');
                setTimeout(() => stream.destroy(Error('forced peer reset')), 10); return;
            }
            if (url === '/truncated') {stream.respond({':status': 200, 'content-length': '100'}); stream.end('partial'); return;}
            if (url === '/excess') {stream.respond({':status': 200, 'content-length': '1'}); stream.write('partial'); return;}
            if (url === '/head') {stream.respond({':status': 200, 'content-length': '100'}); stream.end(); return;}
            if (url === '/not-modified') {stream.respond({':status': 304, 'content-length': '100'}); stream.end(); return;}
            if (url === '/slow') {stream.respond({':status': 200}); stream.write('partial'); return;}
            if (url === '/invalid-gzip') {stream.respond({':status': 200, 'content-encoding': 'gzip'}); stream.end('invalid gzip'); return;}
            if (url.startsWith('/encoding/')) {
                const encoding = url.slice('/encoding/'.length), bytes = Buffer.from('{"unicode":"λ"}');
                const compressed = encoding === 'br' ? zlib.brotliCompressSync(bytes) : encoding.toLowerCase() === 'gzip' ? zlib.gzipSync(bytes) : zlib.deflateSync(bytes);
                stream.respond({':status': 200, 'content-encoding': encoding, 'content-length': String(compressed.length)}); stream.end(compressed); return;
            }
            if (url.startsWith('/retry/')) {
                const records = attempts.get(url) || [];
                records.push({body, identity: headers['x-identity'], values: headers['x-values']}); attempts.set(url, records);
                stream.respond({':status': records.length === 1 ? 503 : 200, 'content-type': 'application/json'});
                stream.end(JSON.stringify({seen: records})); return;
            }
            stream.respond({':status': 200, 'content-type': 'application/json'});
            stream.end(JSON.stringify({headers, body}));
        });
    });
    server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({port: server.address().port})));
    process.stdin.once('data', () => {for (const session of sessions) session.destroy();server.close(() => process.exit());});
}

async function bounded(operation, ms = 1500) {
    let timer;
    try {return await Promise.race([operation.then(() => 'ok', error => error.code), new Promise(resolve => {timer = setTimeout(() => resolve('pending'), ms);})]);}
    finally {clearTimeout(timer);}
}

async function main() {
    const vpm = mode === 'vpm', root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
    const {Http2Client} = require(root + '/lib/utils/api-request');
    // Actual wire checks use the same Node server on both client runtimes.
    const server = spawn('node', [__filename, '--server'], {stdio: ['pipe', 'pipe', 'inherit']});
    let output = '';
    const port = await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.stdout.on('data', bytes => {output += bytes; if (output.includes('\n')) resolve(JSON.parse(output.slice(0, output.indexOf('\n'))).port);});
    });
    const url = `http://127.0.0.1:${port}`, session = require('node:http2').connect(url);
    session.on('error', () => {});
    const nativeRequest = session.request.bind(session);
    // Known upstream :scheme defect is tested separately without this adapter.
    // Normalize only its trailing colon so both implementations reach this server.
    session.request = headers => nativeRequest({...headers, ':scheme': headers[':scheme'].replace(/:$/, '')});
    const handler = {session};
    const config = suffix => ({method: 'GET', url: url + suffix, http2SessionHandler: handler});
    try {
        const retry = {maxRetries: 1, statusCodes: [503], maxDelayInMillis: 100, backOffFactor: 0};
        for (const [index, data] of [{message: 'first'}, Buffer.from('first')].entries()) {
            const request = {...config('/retry/' + index), method: 'POST', data, headers: {'X-Identity': 'first', 'X-Values': ['one']}};
            const client = new Http2Client(retry);
            client.waitForRetry = async () => {
                if (Buffer.isBuffer(data)) data.write('later'); else data.message = 'later';
                request.headers['X-Identity'] = 'later'; request.headers['X-Values'].push('two');
            };
            const {seen} = (await client.send(request)).data;
            assert.equal(seen.length, 2);
            assert.deepEqual(seen[1], vpm ? seen[0] : {body: index ? 'later' : '{"message":"later"}', identity: 'later', values: 'one, two'});
        }
        const typed = await new Http2Client(null).send({...config('/echo?value=λ'), method: 'POST', data: {x: 'λ'}, headers: {'content-type': 'application/custom', 'My-Custom-Header': 'kept'}});
        assert.equal(typed.data.headers['content-type'], 'application/custom');
        assert.equal(typed.data.headers['my-custom-header'], 'kept');
        assert.equal(typed.data.headers[':method'], 'POST');
        assert.equal(typed.data.headers[':scheme'], 'http');
        assert.equal(typed.data.headers[':path'], '/echo?value=%CE%BB');
        assert.equal(typed.data.headers['content-length'], String(Buffer.byteLength(typed.data.body)));
        const mixed = new Http2Client(null).send({...config('/echo'), method: 'POST', data: {x: 1}, headers: {'Content-Type': 'application/custom'}});
        if (vpm) assert.equal((await mixed).data.headers['content-type'], 'application/custom');
        else await assert.rejects(mixed, error => error.cause?.code === 'ERR_HTTP2_HEADER_SINGLE_VALUE');
        for (const encoding of ['gzip', 'deflate', 'GZip', 'br']) {
            const response = await new Http2Client(null).send(config('/encoding/' + encoding));
            if (vpm || encoding === 'gzip' || encoding === 'deflate') {
                assert.deepEqual(response.data, {unicode: 'λ'}); assert.equal(response.headers['content-encoding'], undefined);
            } else assert.equal(response.isJson(), false);
        }
        assert.equal(await bounded(new Http2Client(null).send(config('/no-headers'))), vpm ? 'app/network-error' : 'pending');
        assert.equal(await bounded(new Http2Client(null).send(config('/invalid-gzip'))), vpm ? 'app/network-error' : 'pending');
        assert.equal(await bounded(new Http2Client(null).send(config('/truncated'))), !vpm && process.versions.bun ? 'ok' : 'app/network-error');
        assert.equal((await new Http2Client(null).send({...config('/head'), method: 'HEAD'})).text, '');
        await assert.rejects(new Http2Client(null).send(config('/not-modified')), error => error.response?.status === 304);
        const reset = await bounded(new Http2Client(null).send(config('/reset')));
        assert.equal(reset, 'app/network-error');
        assert.equal(await bounded(new Http2Client(null).send({...config('/slow'), timeout: 30})), 'app/network-timeout');
        // A failed stream must leave its batch session usable.
        assert.equal((await new Http2Client(null).send(config('/echo'))).status, 200);
        // Excess wire data can make Node terminate the whole invalid peer
        // session. Check it last; session reuse is not promised after that.
        assert.equal(await bounded(new Http2Client(null).send(config('/excess'))), !vpm && process.versions.bun ? 'pending' : 'app/network-error');
    } finally {
        session.destroy(); server.stdin.end('close\n'); await once(server, 'exit');
    }

    // Synthetic boundary controls inspect headers before native normalization
    // and make an aborted/error event deterministic without hanging the suite.
    const {EventEmitter} = require('node:events');
    let captured;
    const streamHandler = {session: {request(headers) {
        captured = headers;
        const stream = new EventEmitter();
        stream.setTimeout = () => stream;
        stream.destroy = () => {stream.destroyed = true;};
        stream.end = () => queueMicrotask(() => {
            stream.aborted = true;
            stream.emit('error', Object.assign(Error('stream cancelled'), {code: 'ECONNRESET'}));
            stream.emit('close');
        });
        return stream;
    }}};
    const outcome = await bounded(new Http2Client(null).send({method: 'POST', url: 'https://example.test/right', data: {},
        headers: {':method': 'DELETE', ':path': '/wrong', ':scheme': 'http'}, http2SessionHandler: streamHandler}), 100);
    assert.equal(outcome, vpm ? 'app/network-error' : 'pending');
    assert.equal(captured[':method'], vpm ? 'POST' : 'DELETE');
    assert.equal(captured[':path'], vpm ? '/right' : '/wrong');
    assert.equal(captured[':scheme'], vpm ? 'https' : 'http');
    if (vpm) {
        const {Http2RequestPlan} = require(root + '/lib/utils/http2-request');
        const headers = JSON.parse('{"__proto__":"literal","X-Values":["one"]}'), reads = {};
        const values = {method: 'POST', url: 'https://example.test/path', headers, data: {value: 1}, timeout: 20, http2SessionHandler: streamHandler};
        const input = Object.fromEntries(Object.keys(values).map(key => [key, undefined]));
        for (const key of Object.keys(values)) Object.defineProperty(input, key, {get() {reads[key] = (reads[key] || 0) + 1; return values[key];}});
        const plan = new Http2RequestPlan(input);
        for (const key of Object.keys(values)) assert.equal(reads[key], 1, key);
        headers['X-Values'].push('changed');
        assert.deepEqual(plan.headers['x-values'], ['one']);
        assert.equal(Object.hasOwn(plan.headers, '__proto__'), true);
        assert.equal(plan.headers.__proto__, 'literal');
    }
    console.log(`${mode} HTTP/2: retry bytes, wire headers, compression, reset/truncation, cancellation, timeout and session reuse controls pass.`);
}
