import jwt = require('..');
import { sign, verify, decode, JsonWebTokenError } from '..';
import { generateKeyPairSync, createSecretKey, webcrypto } from 'node:crypto';
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const token: string = sign({ sub: 'student' }, pair.privateKey, { algorithm: 'RS256', expiresIn: '2h' });
const payload: jwt.Payload = verify(token, pair.publicKey, { algorithms: ['RS256'], issuer: ['ventimath'] });
const full: jwt.Jwt = verify(token, pair.publicKey, { complete: true });
const decoded: jwt.Decoded | null = decode(token, { complete: true });
sign({ sub: 'student' }, createSecretKey(Buffer.from('secret')), (error, token) => { void [error, token]; });
verify(token, (header, done) => { const kid: string | undefined = header.kid; done(null, pair.publicKey); void kid; },
  { complete: true }, (error, decoded) => { const h: jwt.JwtHeader | undefined = decoded?.header; void [error, h]; });
const none: string = sign({}, null, { algorithm: 'none' });
const e: Error = new jwt.TokenExpiredError('expired', new Date());
const inner: Error | undefined = new JsonWebTokenError('failure', e).inner;
async function cryptoKey() {
  const key = await webcrypto.subtle.importKey('raw', Buffer.from('secret'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']);
  sign({}, key);
}
// @ts-expect-error unsigned signing requires explicit none
sign({}, null);
// @ts-expect-error key resolvers require a callback
verify(token, (_header: jwt.JwtHeader, done: (error: Error | null, key?: jwt.Key | null) => void) => done(null, 'secret'));
// @ts-expect-error invalid key type bypass is unsupported
sign({}, 'secret', { allowInvalidAsymmetricKeyTypes: true });
void [payload, full, decoded, none, inner, cryptoKey];
