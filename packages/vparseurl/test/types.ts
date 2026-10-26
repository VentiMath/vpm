import { IncomingMessage } from 'node:http';
import { format, UrlWithStringQuery } from 'node:url';
import parseurl = require('..');

declare const request: IncomingMessage;
const optional: parseurl.ParsedUrl | undefined = parseurl(request);
const parsed: parseurl.ParsedUrl = parseurl(Object.freeze({ url: '/path?query=1' }));
const native: UrlWithStringQuery = parsed;
const text: string = format(parsed);
const original: parseurl.ParsedUrl = parseurl.original({ originalUrl: '/mount/path' });
const fallback: parseurl.ParsedUrl = parseurl.original({ url: '/path', originalUrl: null });
const missing: parseurl.ParsedUrl | undefined = parseurl.original({});
parsed.path = null;
parsed.pathname = '/redirect/';
parseurl.clear(request);
void [optional, native, text, original, fallback, missing];

// @ts-expect-error A missing URL can produce undefined.
const required: parseurl.ParsedUrl = parseurl(request);
// @ts-expect-error Request URLs must be strings when present.
parseurl({ url: 42 });
// @ts-expect-error The API takes a request object, not a URL string.
parseurl('/path');
// @ts-expect-error Query is an undecoded string, not a parameter map.
const params: Record<string, string> = parsed.query;
void [required, params];
