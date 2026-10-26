import send = require('vsend');
import defaultImport from 'vsend';
import { createServer, ServerResponse } from 'node:http';
import { createServer as createHttp2Server, Http2ServerResponse } from 'node:http2';
const options: send.SendOptions = { root: '/public', index: ['index.html'], extensions: false, highWaterMark: 16384 };
createServer((req, res) => {
  const stream: send.SendStream = defaultImport(req, '/', options);
  stream.on('headers', (response, filename, stat) => response.setHeader('X-Size', stat.size));
  stream.on('directory', function () { this.error(404); });
  stream.on('error', error => res.end(String(error.status)));
  stream.on('stream', input => input.pause().resume());
  const response: ServerResponse = stream.pipe(res);
  void response;
});
createHttp2Server((req, res) => {
  const response: Http2ServerResponse = send(req, '/', options).pipe(res);
  void response;
});
send({ headers: {}, method: 'GET' }, '/', null);
// @ts-expect-error pathname must be a string
send({ headers: {} }, null);
// @ts-expect-error dotfile modes are explicit
send({ headers: {} }, '/', { dotfiles: 'hidden' });
// @ts-expect-error descriptor injection is not a supported option
send({ headers: {} }, '/', { fd: 1 });
// @ts-expect-error index cannot be true
send({ headers: {} }, '/', { index: true });
