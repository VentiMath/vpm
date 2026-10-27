import Accepts from 'vaccepts';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
declare const req: IncomingMessage;
declare const req2: Http2ServerRequest;
const a: Accepts.Instance = new Accepts(req);
const list: string[] = a.types();
const empty: string[] = a.types([]);
const selected: string | false = a.types(['json', 'html'] as const);
const encoding: string | false = Accepts(req2).encodings('gzip', 'br');
const offered: string[] = [];
const dynamic: string | false | string[] = a.types(offered);
a.lang('en'); a.langs(['en', 'fr']); a.charsets('utf-8');
a.negotiator.mediaType(['text/html']);
// @ts-expect-error headers view is readonly
a.headers = {};
// @ts-expect-error offers must be strings
a.types([1]);
// @ts-expect-error request headers are required
Accepts({});
void [list, empty, selected, encoding, dynamic];
