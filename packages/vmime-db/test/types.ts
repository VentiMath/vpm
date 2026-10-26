import db = require('vmime-db');
import defaultImport from 'vmime-db';
const record: db.Entry | undefined = defaultImport['text/html'];
const extensions: readonly string[] | undefined = record?.extensions;
void extensions;
// @ts-expect-error records may be absent even without noUncheckedIndexedAccess
const missing: db.Entry = db['unknown'];
// @ts-expect-error database entries are readonly
db['text/html'] = {};
if (record) {
  // @ts-expect-error record fields are readonly
  record.charset = 'UTF-8';
  // @ts-expect-error extension lists are readonly
  record.extensions?.push('new');
}
