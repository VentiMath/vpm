/** Generate a compatible HTTP entity tag from bytes, UTF-8 text, or file metadata. */
declare function etag(entity: string | Uint8Array | etag.Stats, options?: etag.Options | null): string;
declare namespace etag {
  interface Stats { size: number | bigint; mtime: Date; }
  interface Options { weak?: boolean; }
}
export = etag;
