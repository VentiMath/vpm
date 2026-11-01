'use strict';
const http = require('node:http');
const {loadStack} = require('./loader.js'), {stackToWire} = require('./manifest.js');
function createDiscoveryServer(directory, controlAPI) {
  const server = http.createServer(async (request, response) => {
    const path = request.url.split('?')[0];
    if (path === '/__/quitquitquit' && ['GET', 'HEAD', 'POST'].includes(request.method)) {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end('ok'); server.close(); return;
    }
    if (controlAPI && path === '/__/functions.yaml' && ['GET', 'HEAD'].includes(request.method)) {
      try {
        const manifest = stackToWire(await loadStack(directory));
        response.setHeader('content-type', 'text/yaml; charset=utf-8');
        response.end(JSON.stringify(manifest));
      } catch (error) {
        console.error(error);
        response.statusCode = 400;
        response.setHeader('content-type', 'text/plain; charset=utf-8');
        response.end('Failed to generate manifest from function source: ' + (error?.message || String(error)));
      }
      return;
    }
    response.statusCode = 404; response.end('Not Found');
  });
  return server;
}
module.exports = {createDiscoveryServer};
