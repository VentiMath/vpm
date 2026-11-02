'use strict';
// The same Node 24 server serves both client runtimes. It loads neither SDK.
const http = require('node:http');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const body = Buffer.alloc(64 * 1024, 97);
const metadata = {name: 'fixture.pdf', bucket: 'fixture', size: String(body.length),
    crc32c: 'TpXtPw==', md5Hash: createHash('md5').update(body).digest('base64'), contentType: 'application/pdf'};
const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://fixture');
        response.setHeader('content-type', 'application/json');
        if (request.method === 'POST' && url.searchParams.get('uploadType') === 'resumable') {
            for await (const chunk of request) void chunk;
            response.setHeader('location', 'http://' + request.headers.host + '/session');
            return response.end();
        }
        if (request.method === 'PUT' && url.pathname === '/session') {
            const chunks = [];for await (const chunk of request) chunks.push(chunk);
            assert.deepEqual(Buffer.concat(chunks), body);
            assert.ok(['bytes 0-65535/65536', 'bytes 0-*/*'].includes(request.headers['content-range']));
            return response.end(JSON.stringify(metadata));
        }
        if (request.method === 'POST') {
            const chunks = [];for await (const chunk of request) chunks.push(chunk);
            assert.ok(Buffer.concat(chunks).includes(body));
            return response.end(JSON.stringify(metadata));
        }
        if (url.searchParams.get('alt') === 'media') {
            response.setHeader('content-type', 'application/pdf');
            response.setHeader('x-goog-hash', 'crc32c=' + metadata.crc32c + ',md5=' + metadata.md5Hash);
            return response.end(body);
        }
        response.end(JSON.stringify(url.pathname.endsWith('/o') ? {items: [metadata]} : metadata));
    } catch (error) {response.statusCode = 500;response.end(JSON.stringify({error: {message: error.message}}));}
});
server.listen(0, '127.0.0.1', () => process.stdout.write(JSON.stringify({port: server.address().port, node: process.versions.node}) + '\n'));
process.stdin.resume();
process.stdin.on('end', () => {server.closeAllConnections();server.close();});
