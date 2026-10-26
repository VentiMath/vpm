import { createServer, WebSocket as HttpWebSocket, MessageEvent as HttpMessageEvent } from 'node:http';
import { createServer as createHttp2Server } from 'node:http2';
import { Readable } from 'node:stream';
import { stat, readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { Buffer, Blob } from 'node:buffer';
import { Worker } from 'node:worker_threads';

const http = createServer((req, res) => { res.setHeader('X-Method', req.method || ''); res.end(Buffer.from('ok')); });
const http2 = createHttp2Server((req, res) => { res.stream.priority({ weight: 10 }); res.end(req.url); });
const emitter = new EventEmitter<{ ready: [number] }>();
emitter.on('ready', value => value.toFixed());
emitter.emit('ready', 2);
// @ts-expect-error typed events retain their payload contract
emitter.emit('ready', 'wrong');
const file: Promise<Buffer> = readFile('/tmp/example');
const metadata: Promise<import('node:fs').BigIntStats> = stat('/tmp/example', { bigint: true });
const stream: Readable = Readable.from([Buffer.from('data')]);
const websocket: WebSocket = new HttpWebSocket('wss://example.test');
const message: MessageEvent = new HttpMessageEvent('message', { data: 'ok' });
const request = new Request('https://example.test', { cache: 'reload' });
const bytes: Promise<Uint8Array> = request.bytes();
const redirect: Response = Response.redirect('https://example.test');
const form = new FormData();
form.append('file', new Blob(['data']), 'file.txt');
// @ts-expect-error a filename cannot be used with a plain string
form.set('file', 'data', 'file.txt');
const worker: Worker = new Worker('source.js');
const timeout: NodeJS.Timeout = setTimeout(() => {}, 10);
timeout.unref();
void [http, http2, file, metadata, stream, websocket, message, bytes, redirect, worker];
