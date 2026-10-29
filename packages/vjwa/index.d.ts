/** Structural types keep consumers independent of Node and DOM declarations.
 * Runtime crypto checks the identity and kind of key objects.
 */
declare namespace jwa {
  type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
    | 'PS256' | 'PS384' | 'PS512' | 'ES256' | 'ES384' | 'ES512' | 'none';
  interface KeyObjectLike {
    readonly type: 'secret' | 'public' | 'private';
    equals(other: never): boolean;
  }
  interface CryptoKeyLike {
    readonly type: 'secret' | 'public' | 'private';
    readonly extractable: boolean;
    readonly algorithm: { readonly name: string };
    readonly usages: readonly string[];
  }
  type Bytes = ArrayBuffer | SharedArrayBuffer | ArrayBufferView;
  interface JsonWebKey {
    kty?: string;
    [name: string]: unknown;
  }
  interface KeyOptions {
    key: string | Bytes | JsonWebKey | KeyObjectLike | CryptoKeyLike;
    format?: 'pem' | 'der' | 'jwk';
    type?: 'pkcs1' | 'pkcs8' | 'sec1' | 'spki';
    passphrase?: string | Bytes;
    encoding?: string;
  }
  type Key = string | Bytes | KeyObjectLike | CryptoKeyLike | KeyOptions;
  interface Signer {
    /** String/byte input is signed as supplied; other input uses JSON.stringify.
     * The none algorithm ignores input/key and returns an empty string.
     */
    sign(input: unknown, key: Key): string;
    /** Malformed signature strings and mismatches return false.
     * Invalid argument types, key import failures and native crypto errors throw.
     */
    verify(input: unknown, signature: string, key: Key): boolean;
  }
  interface UnsecuredSigner {
    sign(input?: unknown, key?: unknown): '';
    verify(input: unknown, signature: string, key?: unknown): boolean;
  }
}
declare function jwa(algorithm: 'none'): jwa.UnsecuredSigner;
declare function jwa(algorithm: Exclude<jwa.Algorithm, 'none'>): jwa.Signer;
declare function jwa(algorithm: jwa.Algorithm): jwa.Signer | jwa.UnsecuredSigner;
export = jwa;
