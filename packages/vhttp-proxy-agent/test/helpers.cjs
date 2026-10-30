'use strict';
const http = require('node:http'), https = require('node:https');
const {start, ssl} = require('../../vhttps-proxy-agent/test/helpers.cjs');
async function proxy(t, secure = false, handler, forwardingAgent = false) {
  const requests = [], sockets = new Set();
  const server = (secure ? https : http).createServer(secure ? {...ssl, ALPNProtocols: ['http/1.1']} : {}, handler || ((request, response) => {
    requests.push(request);
    const url = new URL(request.url), headers = {...request.headers};
    delete headers['proxy-authorization']; delete headers['proxy-connection']; delete headers.connection;
    const upstream = http.request(url, {method: request.method, headers, agent: forwardingAgent}, incoming => {response.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(response);});
    upstream.on('socket', socket => {if (!sockets.has(socket)) {sockets.add(socket); socket.once('close', () => sockets.delete(socket));}});
    upstream.on('error', error => {response.statusCode = 502; response.end(error.code);});
    request.pipe(upstream);
  }));
  await start(t, server);
  if (t) t.after(() => {for (const socket of sockets) socket.destroy();});
  return {server, requests, url: (secure ? 'https' : 'http') + '://127.0.0.1:' + server.address().port};
}
function request(url, options, chunks = []) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      const data = []; res.on('data', chunk => data.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(data)}));
    });
    req.on('error', reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}
module.exports = {proxy, request, start, ssl};
