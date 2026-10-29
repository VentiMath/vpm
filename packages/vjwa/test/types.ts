import jwa from '../index.js';
import { createPrivateKey, createSecretKey, generateKeyPairSync, webcrypto } from 'node:crypto';
const hmac = jwa('HS256');
const text: string = hmac.sign({ sub: 'student' }, 'secret');
const valid: boolean = hmac.verify('text', text, createSecretKey(Buffer.from('secret')));
hmac.sign(new DataView(new ArrayBuffer(8)), new Uint8Array(32));
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
jwa('RS256').sign('text', pair.privateKey);
jwa('PS256').verify('text', text, pair.publicKey);
jwa('ES256').sign('text', createPrivateKey('key'));
jwa('RS256').sign('text', { key: 'pem', passphrase: 'pass' });
jwa('ES256').sign('text', { key: { kty: 'EC', crv: 'P-256' }, format: 'jwk' });
async function withCryptoKey() {
  const key = await webcrypto.subtle.importKey('raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  hmac.sign('text', key);
}
const empty: '' = jwa('none').sign();
jwa('none').verify(null, empty);
// @ts-expect-error exact algorithm names
jwa('hs256');
// @ts-expect-error signing algorithms require a key
hmac.sign('text');
// @ts-expect-error signatures are encoded strings
hmac.verify('text', new Uint8Array(32), 'key');
void [valid, withCryptoKey];
