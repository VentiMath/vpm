import getRawBody = require('vraw-body');
import { PassThrough, Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';

const stream = new PassThrough();
const binary: Promise<Buffer> = getRawBody(stream);
const alsoBinary: Promise<Buffer> = getRawBody(stream, { encoding: false, length: '12', limit: '1kb' });
const text: Promise<string> = getRawBody(stream, { encoding: 'utf8' });
const utf8: Promise<string> = getRawBody(stream, true);
declare const options: getRawBody.Options;
const mixed: Promise<Buffer | string> = getRawBody(stream, options);
declare const req: IncomingMessage;
getRawBody(req, { limit: '100kb' }, (error, body) => {
  if (error) { const status: number | undefined = error.status; void status; }
  else { const bytes: Buffer = body; void bytes; }
});
getRawBody(Readable.from([]), 'utf8', (error, body) => {
  if (!error) body.toUpperCase();
});
getRawBody(stream, (error, body) => {
  // @ts-expect-error body is absent until the error has been checked
  body.toString('hex');
  if (!error) body.toString('hex');
});
// @ts-expect-error encoding cannot be numeric
getRawBody(stream, { encoding: 1 });
// @ts-expect-error a dynamic encoding may return a Buffer
const wrong: Promise<string> = getRawBody(stream, options);
// @ts-expect-error a non-stream is invalid
getRawBody({});
void [binary, alsoBinary, text, utf8, mixed, wrong];
