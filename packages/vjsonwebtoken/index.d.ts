import type jws = require('vjws');
declare namespace jwt {
  type Algorithm = jws.Algorithm;
  type Key = jws.Key;
  interface JwtPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
    nonce?: string;
    [claim: string]: unknown;
  }
  type JwtHeader = jws.Header;
  type Payload = JwtPayload | string;
  interface Jwt { header: JwtHeader; payload: Payload; signature: string; }
  interface Decoded { header: JwtHeader; payload: unknown; signature: string; }
  interface SignOptions {
    algorithm?: Algorithm;
    expiresIn?: number | string;
    notBefore?: number | string;
    audience?: string | string[];
    issuer?: string;
    subject?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    keyid?: string;
    header?: Partial<JwtHeader>;
    encoding?: string;
    mutatePayload?: boolean;
    allowInsecureKeySizes?: boolean;
    /** Disabling key/algorithm validation is intentionally unsupported. */
    allowInvalidAsymmetricKeyTypes?: false;
  }
  interface VerifyOptions {
    algorithms?: readonly Algorithm[];
    audience?: string | RegExp | readonly (string | RegExp)[];
    issuer?: string | readonly string[];
    subject?: string;
    jwtid?: string;
    nonce?: string;
    clockTimestamp?: number;
    clockTolerance?: number;
    maxAge?: number | string;
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    complete?: boolean;
    allowInvalidAsymmetricKeyTypes?: false;
  }
  interface DecodeOptions extends jws.DecodeOptions { complete?: boolean; }
  type SignCallback = (error: Error | null, token?: string) => void;
  type VerifyCallback<T = Payload> = (error: Error | null, decoded?: T) => void;
  type GetPublicKeyOrSecret = (header: JwtHeader, callback: (error: Error | null, key?: Key | null) => void) => void;
  class JsonWebTokenError extends Error { constructor(message: string, error?: Error); inner?: Error; }
  class NotBeforeError extends JsonWebTokenError { constructor(message: string, date: Date); date: Date; }
  class TokenExpiredError extends JsonWebTokenError { constructor(message: string, expiredAt: Date); expiredAt: Date; }
  function sign(payload: unknown, key: Key, options?: SignOptions): string;
  function sign(payload: unknown, key: null, options: SignOptions & { algorithm: 'none' }): string;
  function sign(payload: unknown, key: Key, callback: SignCallback): void;
  function sign(payload: unknown, key: Key | null, options: SignOptions, callback: SignCallback): void;
  function verify(token: string, key: Key | null, options: VerifyOptions & { complete: true }): Jwt;
  function verify(token: string, key: Key | null, options?: VerifyOptions & { complete?: false }): Payload;
  function verify(token: string, key: Key | null, options: VerifyOptions): Payload | Jwt;
  function verify(token: string, key: Key | null | GetPublicKeyOrSecret, callback: VerifyCallback): void;
  function verify(token: string, key: Key | null | GetPublicKeyOrSecret, options: VerifyOptions & { complete: true }, callback: VerifyCallback<Jwt>): void;
  function verify(token: string, key: Key | null | GetPublicKeyOrSecret, options: VerifyOptions & { complete?: false }, callback: VerifyCallback): void;
  function verify(token: string, key: Key | null | GetPublicKeyOrSecret, options: VerifyOptions, callback: VerifyCallback<Payload | Jwt>): void;
  /** Untrusted decoding only. This does not verify a signature or claims. */
  function decode(token: unknown, options: DecodeOptions & { complete: true }): Decoded | null;
  function decode(token: unknown, options?: DecodeOptions): unknown;
}
export = jwt;
