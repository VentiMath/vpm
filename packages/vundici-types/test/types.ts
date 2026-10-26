import type * as Undici from 'vundici-types';
import type * as Web from 'vundici-types/web';
import { Blob } from 'node:buffer';
declare const runtime: typeof Undici;

const init: Undici.RequestInit = { cache: 'no-store', method: 'POST', body: 'data' };
const request: Undici.Request = new runtime.Request('https://example.test', init);
const bytes: Promise<Uint8Array> = request.bytes();
const response = runtime.Response.redirect('https://example.test');
const responseBytes: Promise<Uint8Array> = response.bytes();
const webResponse: Web.Response = response;
const form = new runtime.FormData();
form.append('number', 42);
form.set('blob', new Blob(['data']), 'file.txt');
form.append('blob', new Blob(['data']), undefined);
// @ts-expect-error a filename requires a Blob value
form.append('field', 'text', 'file.txt');
// @ts-expect-error an explicitly undefined third argument also requires a Blob
form.set('field', 42, undefined);
// @ts-expect-error cache is a defined mode, not an arbitrary string
new runtime.Request('https://example.test', { cache: 'sometimes' });
// @ts-expect-error a non-redirect status is invalid
runtime.Response.redirect('https://example.test', 200);
const agent = new runtime.Agent({ connections: 2 });
const pool = new runtime.Pool('https://example.test', { connections: 2 });
const mock = new runtime.MockAgent();
mock.get('https://example.test').intercept({ path: '/', method: 'GET' }).reply(200, 'ok');
const dispatcher: Undici.Dispatcher = agent;
const stream: ReturnType<Undici.Dispatcher['pipeline']> = dispatcher.pipeline({ path: '/', method: 'GET' }, data => data.body);
void [init, bytes, responseBytes, webResponse, pool, mock, stream];
