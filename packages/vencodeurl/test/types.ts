import encodeUrl = require('..');
import encodeUrlDefault from '..';

const url: string = encodeUrl('/path with spaces');
const missing: string = encodeUrl();
const opaque: unknown = { toString: () => '/custom path' };
const converted: string = encodeUrl(opaque);
const primitive: string = encodeUrl(Symbol('name'));
const imported: string = encodeUrlDefault('/path');
void [url, missing, converted, primitive, imported];

// @ts-expect-error Encoded URLs are strings.
const numeric: number = encodeUrl('/path');
// @ts-expect-error The API has one input and no options argument.
encodeUrl('/path', { decode: true });
void numeric;
