import signature, { sign, unsign, type Secret } from 'vcookie-signature';
import { createSecretKey, webcrypto } from 'node:crypto';
const key: Secret = createSecretKey(new Uint8Array([1, 2, 3]));
const signed: string = sign('value', key);
const result: string | false = unsign(signed, key);
signature.sign('value', 'secret');
sign('value', new DataView(new ArrayBuffer(4)));
sign('value', new SharedArrayBuffer(4));
async function cryptoKey() {
  const key = await webcrypto.subtle.importKey('raw', new Uint8Array([1, 2, 3]), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  sign('value', key);
}
// @ts-expect-error value must be a string
sign(1, key);
// @ts-expect-error key is required
sign('value');
// @ts-expect-error arbitrary records are not keys
sign('value', {});
// @ts-expect-error unsign can fail
const value: string = result;
void [cryptoKey, value];
