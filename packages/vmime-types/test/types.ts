import mime = require('vmime-types');
import defaultImport from 'vmime-types';
const type: string | false = mime.lookup('path/file.json');
const header: string | false = defaultImport.contentType('json');
const extension: string | false = mime.extension('application/json');
const charset: string | false = mime.charsets.lookup('text/html');
const extensions: readonly string[] | undefined = mime.extensions['text/html'];
void [type, header, extension, charset, extensions];
// @ts-expect-error unknown table keys may be absent
const absent: string = mime.types['unknown'];
// @ts-expect-error accepts strings
mime.lookup({});
// @ts-expect-error methods cannot be replaced
mime.lookup = () => false;
// @ts-expect-error extension lists are readonly
extensions?.push('foo');
// @ts-expect-error type maps are readonly
mime.types.html = 'changed';
