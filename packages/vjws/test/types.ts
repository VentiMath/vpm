import jws = require('..');
import { sign, verify, decode, createSign } from '..';
import { createSecretKey, generateKeyPairSync, webcrypto } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
const token: string = sign({ header: { alg: 'HS256', kid: '雪' }, payload: { sub: 'student' }, secret: 'secret' });
const valid: boolean = verify(token, 'HS256', createSecretKey(Buffer.from('secret')));
const noSignature: string = jws.sign({ header: { alg: 'none' }, payload: '' });
const unsecured: boolean = jws.verify(noSignature, 'none');
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
jws.sign({ header: { alg: 'RS256' }, payload: Buffer.from([0, 255]), key: pair.privateKey });
const signer = createSign({ header: { alg: 'HS256' }, secret: 'secret' });
Readable.from(['x']).pipe(signer.payload);
signer.on('done', (signature: string) => verify(signature, 'HS256', 'secret'));
signer.pipe(new Writable({ objectMode: true, write(_chunk, _encoding, done) { done(); } }));
const verifier = jws.createVerify({ algorithm: 'HS256', signature: signer, secret: 'secret' });
verifier.on('done', (ok, decoded) => { const flag: boolean = ok; const header: jws.Header | undefined = decoded?.header; void [flag, header]; });
verifier.signature.write(new DataView(new ArrayBuffer(4)));
const result: jws.Decoded | null = decode(token, { encoding: 'hex' });
const check: boolean = jws.isValid(result);
async function consume() {
  for await (const signature of signer) { const value: string = signature; void value; }
  for await (const valid of verifier) { const value: boolean = valid; void value; }
  const key = await webcrypto.subtle.importKey('raw', Buffer.from('secret'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']);
  jws.sign({ header: { alg: 'HS256' }, payload: new Uint8Array([1]), secret: key });
}
// @ts-expect-error signed sync operations require a key
jws.sign({ header: { alg: 'HS256' }, payload: '' });
// @ts-expect-error algorithms are explicit and supported
jws.verify(token, 'EdDSA', 'secret');
// @ts-expect-error outputs are tokens, not numbers
const numeric: number = signer.sign();
void [valid, unsecured, check, consume, numeric];
