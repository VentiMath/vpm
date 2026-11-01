'use strict';
const assert = require('node:assert/strict'), http = require('node:http'), zlib = require('node:zlib'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const variant = process.argv[2];
if (!variant) {
  for (const kind of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, kind], {encoding: 'utf8', timeout: 60000});
    assert.equal(child.status, 0, child.stdout + child.stderr);
  }
  console.log('Admin HTTP: immutable retry bytes, headers, partial responses, compression, timeouts, agents and keep-alive controls pass.');
} else main().catch(error => {console.error(error); process.exitCode = 1;});

async function main() {
  const vpm = variant === 'vpm', root = path.resolve(__dirname, vpm ? '../../packages/vfirebase-admin' : 'node_modules/firebase-admin');
  const {HttpClient} = require(root + '/lib/utils/api-request');
  if (vpm) {
    const {HttpRequestPlan} = require(root + '/lib/utils/http-request');
    const headers = JSON.parse('{"__proto__":"header-data","Constructor":"literal"}');
    headers['X-List'] = ['one'];
    const plan = new HttpRequestPlan({url: 'http://example.test', method: 'GET', headers});
    headers['X-List'][0] = 'changed';
    assert.equal(Object.getPrototypeOf(plan.headers), null);
    assert.equal(plan.headers.__proto__, 'header-data'); assert.equal(plan.headers.constructor, 'literal');
    assert.deepEqual(plan.headers['x-list'], ['one']);
    const reads = {};
    const values = {url: 'http://example.test', method: 'POST', headers: {}, data: {one: 1}, timeout: 10, httpAgent: undefined};
    const changing = Object.fromEntries(Object.keys(values).map(key => [key, undefined]));
    for (const key of Object.keys(values)) Object.defineProperty(changing, key, {get() {reads[key] = (reads[key] || 0) + 1; return values[key];}});
    new HttpRequestPlan(changing);
    for (const key of Object.keys(values)) assert.equal(reads[key], 1, key + ' is captured once');
    assert.throws(() => new HttpRequestPlan({method: 'GET'}), /Request URL must be a string/);
  }
  let respond;
  const server = http.createServer(async (request, response) => {
    let bytes = ''; for await (const chunk of request) bytes += chunk;
    respond(request, response, bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/request';
  const retry = {maxRetries: 1, statusCodes: [503], maxDelayInMillis: 100, backOffFactor: 0};
  const agent = new http.Agent({keepAlive: true, maxSockets: 1});
  const bounded = async operation => {
    let timer;
    try {return await Promise.race([operation.then(() => 'ok', error => error.code), new Promise(resolve => {timer = setTimeout(() => resolve('pending'), 1500);})]);}
    finally {clearTimeout(timer);}
  };
  try {
    for (const data of [{message: 'first'}, Buffer.from('first')]) {
      const seen = [], sockets = [];
      const config = {url, method: 'POST', data, headers: {'X-Identity': 'first'}, httpAgent: agent};
      respond = (request, response, body) => {
        seen.push({body, identity: request.headers['x-identity']}); sockets.push(request.socket);
        response.setHeader('content-type', 'application/json');
        if (seen.length === 1) {
          if (Buffer.isBuffer(data)) data.write('later'); else data.message = 'later';
          config.headers['X-Identity'] = 'later'; response.writeHead(503); response.end('{}');
        } else response.end('{"ok":true}');
      };
      assert.deepEqual((await new HttpClient(retry).send(config)).data, {ok: true});
      assert.equal(seen.length, 2); assert.equal(sockets[0], sockets[1], 'completed error response keeps its connection reusable');
      assert.deepEqual(seen[1], vpm ? seen[0] : {body: Buffer.isBuffer(data) ? 'later' : '{"message":"later"}', identity: 'later'});
    }
    respond = (request, response) => response.end(JSON.stringify({type: request.headers['content-type'], length: request.headers['content-length']}));
    const typed = await new HttpClient(null).send({url, method: 'POST', data: {x: 1}, headers: {'Content-Type': 'application/custom'}, httpAgent: agent});
    assert.equal(typed.data.type, vpm ? 'application/custom' : 'application/json;charset=utf-8');
    assert.equal(typed.data.length, '7');
    for (const encoding of ['gzip', 'deflate', 'GZip', 'br']) {
      const source = Buffer.from('{"unicode":"λ"}');
      const encoded = encoding.toLowerCase() === 'gzip' ? zlib.gzipSync(source) : encoding === 'br' ? zlib.brotliCompressSync(source) : zlib.deflateSync(source);
      respond = (_request, response) => {response.writeHead(200, {'content-encoding': encoding}); response.end(encoded);};
      const result = await new HttpClient(null).send({url, method: 'GET', httpAgent: agent});
      if (vpm || encoding === 'gzip' || encoding === 'deflate') {assert.deepEqual(result.data, {unicode: 'λ'}); assert.equal(result.headers['content-encoding'], undefined);}
      else assert.equal(result.isJson(), false);
    }
    respond = (_request, response) => {response.writeHead(200, {'content-encoding': 'gzip'}); response.end('invalid gzip');};
    assert.equal(await bounded(new HttpClient(null).send({url, method: 'GET'})), vpm ? 'app/network-error' : 'pending');
    respond = (_request, response) => {response.writeHead(200, {'content-length': '100'}); response.write('partial'); setTimeout(() => response.socket?.end(), 10);};
    const truncated = await bounded(new HttpClient(null).send({url, method: 'GET'}));
    assert.equal(truncated, vpm ? 'app/network-error' : 'pending');
    respond = (_request, response) => {response.writeHead(200); response.write('partial');};
    assert.equal(await bounded(new HttpClient(null).send({url, method: 'GET', timeout: 30})), 'app/network-timeout');
    // Reusing a caller Buffer must not mutate it even when request construction
    // normalizes headers or the response fails.
    const data = Buffer.from('owned');
    respond = (_request, response, body) => response.end(JSON.stringify({body}));
    assert.deepEqual((await new HttpClient(null).send({url, method: 'POST', data, httpAgent: agent})).data, {body: 'owned'});
    assert.equal(data.toString(), 'owned');
  } finally {agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
}
