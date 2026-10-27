import Negotiator from 'vnegotiator';
import { Negotiator as NamedNegotiator } from 'vnegotiator';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
declare const req: IncomingMessage;
declare const req2: Http2ServerRequest;
const n: Negotiator.Instance = new NamedNegotiator(req);
const selected: string | undefined = n.mediaType(['text/html', 'application/json'] as const);
const all: string[] = Negotiator(req2).languages();
n.encodings(['gzip', 'br'], { preferred: ['br'] as const });
n.preferredMediaTypes(null);
n.preferredEncoding(undefined, null);
n.request = req2;
// @ts-expect-error offers must be arrays
n.mediaTypes('text/html');
// @ts-expect-error preferred encodings must be strings
n.encodings([], { preferred: [1] });
// @ts-expect-error request headers are required
Negotiator({});
void [selected, all];
