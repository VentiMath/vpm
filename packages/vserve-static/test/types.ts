import serveStatic = require('vserve-static');
import defaultImport from 'vserve-static';
import { createServer, ServerResponse } from 'node:http';
import { createServer as http2Server, Http2ServerResponse } from 'node:http2';
const middleware = defaultImport('/public', { index: ['index.html'], setHeaders(response, path, stat) {
  response.setHeader('X-Size', stat.size); this.isCachable();
} });
createServer((req, res) => middleware(req, res, error => res.end(String(error))));
http2Server((req, res) => middleware(req, res, error => res.end(String(error))));
serveStatic<ServerResponse>('/public', { setHeaders(res) { res.writeContinue(); } });
serveStatic<Http2ServerResponse>('/public', { setHeaders(res) { res.stream.priority({ weight: 10 }); } });
// @ts-expect-error root is a separate required parameter
serveStatic('/public', { root: '/other' });
// @ts-expect-error setHeaders is a function
serveStatic('/public', { setHeaders: false });
// @ts-expect-error redirect is boolean
serveStatic('/public', { redirect: 'false' });
// @ts-expect-error root must be a path string
serveStatic(null);
