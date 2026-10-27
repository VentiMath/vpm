import bodyParser, { json, raw, text, urlencoded } from 'vbody-parser';
import jsonSubpath from 'vbody-parser/json';
import rawSubpath from 'vbody-parser/raw';
import textSubpath from 'vbody-parser/text';
import formSubpath from 'vbody-parser/urlencoded';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
const middleware = json<IncomingMessage, ServerResponse>({
  limit: '1mb', type: Object.freeze(['json', '+JSON']),
  verify(req, res, bytes, encoding) { res.setHeader('X-Bytes', bytes.length); req.resume; bytes.toString('hex'); void encoding; },
  reviver(key, value) { return key === 'secret' ? undefined : value; },
});
createServer((req, res) => middleware(req, res, error => { if (error) res.statusCode = 400; res.end(); }));
const same: typeof json = jsonSubpath;
const factories = [bodyParser.json, raw, text, urlencoded, rawSubpath, textSubpath, formSubpath];
urlencoded({ extended: true, parameterLimit: Infinity, depth: 32 });
// @ts-expect-error byte limits cannot be arbitrary objects
raw({ limit: {} });
// @ts-expect-error strict must be a boolean
json({ strict: 'false' });
// @ts-expect-error form limits require numbers
urlencoded({ parameterLimit: '100' });
// @ts-expect-error verify sees bytes, not text
text({ verify(_req, _res, buffer) { buffer.toUpperCase(); } });
void [same, factories];
