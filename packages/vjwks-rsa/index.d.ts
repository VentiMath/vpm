declare function jwksRsa(options: jwksRsa.Options): jwksRsa.JwksClient;
declare namespace jwksRsa {
  interface JSONWebKey {
    kty?: string; use?: string; alg?: string; kid?: string; crv?: string;
    n?: string; e?: string; x?: string; y?: string; key_ops?: readonly string[];
    [key: string]: unknown;
  }
  interface SigningKey {
    readonly kid?: string;
    readonly alg?: string;
    readonly publicKey: string;
    readonly rsaPublicKey: string;
    getPublicKey(): string;
  }
  type CertSigningKey = SigningKey;
  type RsaSigningKey = SigningKey;
  interface Headers { [key: string]: string; }
  /** Structural Node HTTP(S) Agent contract; no ambient Node types required. */
  interface RequestAgent { destroy(): void; }
  interface OptionsBase {
    cache?: boolean; cacheMaxEntries?: number; cacheMaxAge?: number;
    /** Opt-in extra lifetime after cacheMaxAge, measured from the last successful lookup. Stale reads never extend it. */
    cacheMaxAgeFallback?: number;
    onStaleCacheFallback?(error: Error, kid: string | null | undefined, key: SigningKey): void | Promise<void>;
    rateLimit?: boolean; jwksRequestsPerMinute?: number;
    timeout?: number; maxResponseBytes?: number; maxKeys?: number;
    requestHeaders?: Headers; requestAgent?: RequestAgent | false;
    getKeysInterceptor?(): readonly JSONWebKey[] | null | undefined | PromiseLike<readonly JSONWebKey[] | null | undefined>;
  }
  interface OptionsWithUri extends OptionsBase {
    jwksUri: string;
    fetcher?(jwksUri: string): { keys: readonly JSONWebKey[] } | PromiseLike<{ keys: readonly JSONWebKey[] }>;
  }
  interface OptionsWithFetcher extends OptionsBase {
    jwksUri?: string;
    fetcher(jwksUri: string | undefined): { keys: readonly JSONWebKey[] } | PromiseLike<{ keys: readonly JSONWebKey[] }>;
  }
  type Options = OptionsWithUri | OptionsWithFetcher;
  type SigningKeyCallback = (error: Error | null, key?: SigningKey) => void;
  class JwksClient {
    constructor(options: Options);
    readonly options: Readonly<OptionsBase & { jwksUri?: string }>;
    getKeys(): Promise<JSONWebKey[]>;
    getSigningKeys(): Promise<SigningKey[]>;
    getSigningKey(kid?: string | null): Promise<SigningKey>;
    getSigningKey(kid: string | null | undefined, callback: SigningKeyCallback): void;
  }
  interface TokenHeader { alg: string; kid?: string | null; [key: string]: unknown; }
  interface DecodedToken { header: TokenHeader; }
  type secretType = string | Uint8Array;
  type SecretCallback = (req: unknown, rawJwtToken: string, done: (error: Error | null, secret?: string | null) => void) => void;
  type SecretCallbackLong = (req: unknown, header: TokenHeader, payload: unknown, done: (error: Error | null, secret?: string) => void) => void;
  type GetVerificationKey = (req: unknown, token: DecodedToken | undefined) => Promise<string | undefined>;
  type ExpressJwtOptions = Options & { handleSigningKeyError?(error: Error, callback: (error?: Error | null) => void): void | Promise<void>; };
  function expressJwtSecret(options: ExpressJwtOptions): SecretCallbackLong & GetVerificationKey;
  function passportJwtSecret(options: ExpressJwtOptions): SecretCallback;
  type KoaJwtOptions = Options & { handleSigningKeyError?(error: Error): unknown | PromiseLike<unknown>; };
  function koaJwtSecret(options: KoaJwtOptions): (header?: TokenHeader) => Promise<string>;
  type HapiJwtOptions = ExpressJwtOptions;
  type HapiCallback = (error: Error | null, publicKey?: string | null, signingKey?: SigningKey | null) => void;
  function hapiJwt2Key(options: HapiJwtOptions): (decoded: DecodedToken | undefined, callback: HapiCallback) => void;
  function hapiJwt2KeyAsync(options: HapiJwtOptions): (decoded: DecodedToken | undefined) => Promise<{ key: string }>;
  class ArgumentError extends Error { name: 'ArgumentError'; constructor(message: string); }
  class JwksError extends Error { name: 'JwksError'; code?: string; statusCode?: number; isEndpointUnavailable?: true; constructor(message: string); }
  class JwksRateLimitError extends Error { name: 'JwksRateLimitError'; constructor(message?: string); }
  class SigningKeyNotFoundError extends Error { name: 'SigningKeyNotFoundError'; constructor(message: string); }
}
export = jwksRsa;
