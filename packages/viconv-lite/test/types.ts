import iconv, { encode, decode, getDecoder, type Encoding, type ByteBuffer } from 'viconv-lite';
import { Readable, PassThrough } from 'node:stream';
const name: Encoding = 'utf8';
const bytes: Buffer = encode('hi', name);
const typed: ByteBuffer = encode('hi', name);
// @ts-expect-error the native Buffer result must not degrade to any
const wrongResult: string = encode('hi', name);
// @ts-expect-error the alias must retain byte-buffer typing
const wrongBytes: ByteBuffer = 'not bytes';
const text: string = decode(new Uint8Array([0x61]), 'UTF-8');
const decoder = getDecoder('utf8', { stripBOM() {} });
const chunk: string = decoder.write(bytes);
const tail: string | undefined = decoder.end();
iconv.encodeStream('utf16', Object.freeze({ highWaterMark: 1 })).pipe(iconv.decodeStream('utf16'));
Readable.from(['abc']).pipe(iconv.encodeStream('utf8')).pipe(new PassThrough());
iconv.decodeStream('utf8').collect((error, result) => { if (!error) result?.toUpperCase(); });
iconv.encodeStream('utf8').on('data', output => { const b: Buffer = output; b.toString('hex'); });
// @ts-expect-error strings are not decoding input
decode('abc', 'utf8');
// @ts-expect-error encoder input must be a string
encode(1, 'utf8');
// @ts-expect-error BOM options are typed
iconv.getEncoder('utf8', { addBOM: 'yes' });
void [typed, text, chunk, tail, wrongResult, wrongBytes];
