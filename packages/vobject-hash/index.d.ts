/** Deterministic serialization compatible with object-hash 3 for ordinary inputs.
 * Corrected binary, sparse-array, DataView and file cases intentionally change
 * digests. Hashes are cache fingerprints, not authentication or password hashes.
 */
declare function objectHash(value: unknown, options: objectHash.Options & {encoding:'buffer'}): objectHash.HashBuffer;
declare function objectHash(value: unknown, options?: objectHash.Options & {encoding?: Exclude<objectHash.Encoding,'buffer'>}): string;
declare function objectHash(value: unknown, options: objectHash.Options): string | objectHash.HashBuffer;
declare namespace objectHash {
  type Encoding = 'hex' | 'binary' | 'base64' | 'buffer' | 'utf8';
  interface Options {
    algorithm?: string;
    encoding?: Encoding;
    excludeValues?: boolean;
    ignoreUnknown?: boolean;
    respectType?: boolean;
    respectFunctionNames?: boolean;
    respectFunctionProperties?: boolean;
    unorderedArrays?: boolean;
    unorderedSets?: boolean;
    unorderedObjects?: boolean;
    replacer?: (value: unknown) => unknown;
    excludeKeys?: (key: string) => boolean;
  }
  interface HashBuffer extends Uint8Array {
    toString(encoding?: 'hex'|'base64'|'base64url'|'utf8'|'utf-8'|'binary'|'latin1'|'ascii', start?: number, end?: number): string;
    equals(other: Uint8Array): boolean;
  }
  type Sink = {write(data: string | Uint8Array, encoding: 'utf8'): unknown} | {update(data: string | Uint8Array, encoding: 'utf8'): unknown};
  function sha1(value: unknown): string;
  function MD5(value: unknown): string;
  function keys(value: unknown): string;
  function keysMD5(value: unknown): string;
  function writeToStream(value: unknown, stream: Sink): void;
  function writeToStream(value: unknown, options: Options, stream: Sink): void;
}
export = objectHash;
