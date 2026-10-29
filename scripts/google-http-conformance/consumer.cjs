'use strict';
const http = require('node:http');
const assert = require('node:assert/strict');
const {Readable} = require('node:stream');
module.exports = async function(from) {
  const {teenyRequest} = from('teeny-request');
  const {Gaxios} = from('gaxios');
  let attempts = 0;
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      response.setHeader('content-type', 'application/json');
      if (request.url === '/retry' && ++attempts === 1) response.statusCode = 503;
      response.end(JSON.stringify({type: request.headers['content-type'], body, url: request.url}));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new Gaxios({noProxy: ['*'], responseType: 'json'});
  try {
    const uri = 'http://127.0.0.1:' + server.address().port;
    const result = await new Promise((resolve, reject) => teenyRequest({uri, method: 'POST', headers: {}, multipart: [{'Content-Type': 'application/json', body: '{"metadata":true}'}, {'Content-Type': 'text/plain', body: Readable.from(['payload'])}]}, (error, response, body) => error ? reject(error) : resolve(body)));
    const boundary = result.type.split('boundary=')[1];
    assert.match(boundary, /^[a-f0-9-]{36}$/);
    assert(result.body.includes(boundary));
    assert(result.body.includes('payload'));
    assert(result.body.includes('"metadata":true'));
    const ordinary = await client.request({url: uri + '/query', method: 'POST', params: {q: 'a b'}, data: {ok: true}});
    assert.equal(ordinary.data.url, '/query?q=a%20b');
    assert.equal(ordinary.data.body, '{"ok":true}');
    const multipart = await client.request({url: uri, method: 'POST', multipart: [{headers: {'Content-Type': 'text/plain'}, content: Readable.from(['google-upload'])}]});
    assert(multipart.data.body.includes('google-upload'));
    await client.request({url: uri + '/retry', retry: true, retryConfig: {retryDelay: 0, maxRetryDelay: 0}});
    assert.equal(attempts, 2);
  } finally {
    client.destroy?.();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
};
