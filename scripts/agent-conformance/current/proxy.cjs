'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const http = require('node:http'), https = require('node:https');
const {once} = require('node:events'), {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../..');
const modules = path.resolve(__dirname, '../node_modules');

(async () => {
  assert.equal(require(path.join(modules, 'agent-base/package.json')).version, '9.0.0');
  assert.equal(require(path.join(modules, 'http-proxy-agent/package.json')).version, '9.1.0');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vagent-current-proxy-'));
  const servers = [], agents = [];
  try {
    fs.symlinkSync(modules, path.join(directory, 'node_modules'), 'dir');
    const ssl = {key: fs.readFileSync(path.join(__dirname, 'upstream/ssl-cert-snakeoil.key')), cert: fs.readFileSync(path.join(__dirname, 'upstream/ssl-cert-snakeoil.pem'))};
    const source = fs.readFileSync(path.join(modules, 'http-proxy-agent/dist/index.js'), 'utf8');
    assert.equal(source.split("from 'agent-base'").length, 2);
    const variants = [['upstream', path.join(modules, 'agent-base/dist/index.js')], ['vpm', path.join(root, 'packages/vagent-base/index.js')]];
    for (const [variant, entry] of variants) {
      // Preserve the published proxy module, changing only its agent-base import.
      fs.writeFileSync(path.join(directory, variant + '.mjs'), source.replace("from 'agent-base'", 'from ' + JSON.stringify(pathToFileURL(entry).href)));
    }
    for (const [variant, entry] of variants) {
      const file = path.join(directory, variant + '.mjs');
      const {HttpProxyAgent} = await import(pathToFileURL(file).href);
      const {Agent} = await import(pathToFileURL(entry).href);
      assert(HttpProxyAgent.prototype instanceof Agent);
      for (const secure of [false, true]) {
        const observed = []; let connections = 0;
        const server = (secure ? https : http).createServer(secure ? ssl : {}, async (request, response) => {
          const chunks = []; for await (const chunk of request) chunks.push(chunk);
          observed.push({url: request.url, auth: request.headers['proxy-authorization'], body: Buffer.concat(chunks), method: request.method});
          response.end('proxied');
        });
        servers.push(server); server.on('connection', () => connections++);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const proxy = `${secure ? 'https' : 'http'}://user:pass@127.0.0.1:${server.address().port}`;
        const agent = new HttpProxyAgent(proxy, {keepAlive: true, maxSockets: 1, rejectUnauthorized: false});
        agents.push(agent); let events = 0;
        agent.on('proxyConnect', ({socket}) => {assert(socket); events++;});
        const payload = Buffer.from([0, 1, 128, 255]);
        for (const method of ['GET', 'POST']) {
          const request = http.request('http://origin.invalid:8080/path?q=1', {agent, method});
          const response = once(request, 'response'); request.end(method === 'POST' ? payload : undefined);
          const [incoming] = await response; const chunks = [];
          for await (const chunk of incoming) chunks.push(chunk);
          assert.equal(Buffer.concat(chunks).toString(), 'proxied');
        }
        assert.equal(observed.length, 2); assert.equal(connections, 1); assert.equal(events, 1);
        assert.equal(observed[0].url, 'http://origin.invalid:8080/path?q=1');
        assert.equal(observed[0].auth, 'Basic ' + Buffer.from('user:pass').toString('base64'));
        assert.equal(observed[1].method, 'POST'); assert.deepEqual(observed[1].body, payload);
        agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      }
      console.log(`http-proxy-agent 9.1.0 with ${variant}: ESM subclass, HTTP/TLS proxy sockets, absolute URLs, Basic auth, keep-alive, events and exact POST bytes passed.`);
    }
  } finally {
    for (const agent of agents) agent.destroy();
    for (const server of servers) {server.closeAllConnections(); if (server.listening) await new Promise(resolve => server.close(resolve));}
    fs.rmSync(directory, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
