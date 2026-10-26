import etag = require('vetag');
import defaultImport from 'vetag';
import { statSync } from 'node:fs';
const results: string[] = [etag('text'), defaultImport(Buffer.from('bytes')), etag(new Uint8Array(1)),
  etag(statSync('.')), etag(statSync('.', { bigint: true })), etag({ size: 1n, mtime: new Date() }, { weak: false })];
void results;
// @ts-expect-error unsupported entity
etag(1);
