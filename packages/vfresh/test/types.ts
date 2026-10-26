import fresh = require('vfresh');
import defaultImport from 'vfresh';
import { createServer } from 'node:http';
createServer((req, res) => { const result: boolean = fresh(req.headers, res.getHeaders()); void result; });
const result: boolean = defaultImport({ 'if-none-match': ['"a"', '"b"'] }, { etag: '"a"' });
void result;
// @ts-expect-error header values cannot be objects
fresh({ etag: {} }, {});
