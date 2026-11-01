'use strict';
// Protocol control: run the same Node HTTP/2 server for Node and Bun clients.
// Some Bun server builds accept a colon in :scheme, which hides the defect.
const http2 = require('node:http2');
const seen = [], server = http2.createServer();
server.on('stream', (stream, headers) => {
  seen.push(headers[':scheme']);
  stream.respond({':status': 200, 'content-type': 'application/json'});
  stream.end('{"ok":true}');
});
server.listen(0, '127.0.0.1', () => process.stdout.write(JSON.stringify({port: server.address().port}) + '\n'));
process.stdin.once('data', () => server.close(() => {
  process.stdout.write(JSON.stringify({seen}) + '\n', () => process.exit(0));
}));
