import typeis from 'vtype-is';
import { is, hasBody, normalize, match } from 'vtype-is';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
declare const request: IncomingMessage;
declare const request2: Http2ServerRequest;
const types = ['json', 'text/*'] as const;
const result: string | false | null = typeis(request, types);
typeis(request2, 'html', 'json');
const body: boolean = hasBody(request);
const header: string | false = is('text/html', types);
is(request, 'text/*');
const normalized: string | false = normalize('json');
const matched: boolean = match('application/*+json', 'application/problem+json');
// @ts-expect-error request headers are required
typeis({});
// @ts-expect-error Node headers are strings or arrays, never numbers
hasBody({ headers: { 'content-length': 1 } });
// @ts-expect-error patterns must be strings
is('text/html', [1]);
void [result, body, header, normalized, matched];
