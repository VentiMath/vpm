import {teenyRequest, RequestError, type Request, type Response} from '..';
import {Readable, Writable} from 'node:stream';
import {Headers} from 'vnode-fetch';
const stream: Request = teenyRequest({uri: 'http://example.test', proxy: false, signal: new AbortController().signal});
stream.pipe(new Writable({write(chunk, encoding, done) {done();}}));
stream.abort().resume().setEncoding('utf8');
teenyRequest<{ok: boolean}>({url: 'https://example.test', headers: new Headers(), pool: {ca: Buffer.from('cert'), maxSockets: Infinity}}, (error, response, body) => {
  if (error) {const code: string | number | undefined = error.code; void code;}
  if (response) {const r: Response<{ok: boolean}> = response; const status: number = r.statusCode; void status;}
  const value: boolean | undefined = body?.ok; void value;
});
const defaults = teenyRequest.defaults({uri: 'http://example.test', timeout: 100, method: 'POST'});
defaults({multipart: [{body: Readable.from(['hello']), 'Content-Type': 'text/plain'}, {body: new DataView(new ArrayBuffer(8))}]}, () => {});
teenyRequest.stats.setOptions({concurrentRequests: 100}); teenyRequest.resetStats(); teenyRequest.close(); new RequestError('failure');
// @ts-expect-error an endpoint is required outside defaults
teenyRequest({method: 'GET'});
// @ts-expect-error invalid proxy kind
teenyRequest({uri: 'http://example.test', proxy: true});
