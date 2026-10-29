import retry = require('vretry-request');
import { PassThrough } from 'node:stream';
import { request } from 'node:http';
const callbackHandle = retry('http://localhost', {request: (_options, cb) => {
  cb(null, {statusCode: 200}, 'ok');
  return request('http://localhost');
}}, (error, response, body) => { void [error, response?.statusCode, body]; });
callbackHandle.abort();
const stream = retry(null, {objectMode: true, request: () => new PassThrough({objectMode: true})});
stream.pipe(new PassThrough());
stream.on('response', response => { const status: number = response.statusCode; void status; });
stream.abort();
async function consume() { for await (const chunk of stream) void chunk; }
void consume;
retry.defaults.request = () => new PassThrough();
retry.getNextRetryDelay({maxRetryDelay: 64, retryDelayMultiplier: 2, retryNumber: 1, timeOfFirstRequest: Date.now(), totalTimeout: 600});
// @ts-expect-error missing retryNumber and timeOfFirstRequest
retry.getNextRetryDelay({maxRetryDelay: 64, retryDelayMultiplier: 2, totalTimeout: 600});
