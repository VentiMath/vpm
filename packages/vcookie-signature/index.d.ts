/** Structural key types keep consumers independent of Node and DOM declarations.
 * Native crypto verifies that an object is a genuine supported secret key.
 */
export interface KeyObjectLike {
  readonly type: 'secret' | 'public' | 'private';
  equals(other: never): boolean;
}
export interface CryptoKeyLike {
  readonly type: 'secret' | 'public' | 'private';
  readonly extractable: boolean;
  readonly algorithm: { readonly name: string };
  readonly usages: readonly string[];
}
export type Secret = string | ArrayBuffer | SharedArrayBuffer | ArrayBufferView | KeyObjectLike | CryptoKeyLike;
/** HMAC-SHA256, standard base64 without padding; preserves upstream wire format. */
export function sign(value: string, secret: Secret): string;
/** Returns the original value (including an empty string) or false on mismatch.
 * Invalid arguments/keys throw. Only signature comparison is timing-safe.
 */
export function unsign(input: string, secret: Secret): string | false;
