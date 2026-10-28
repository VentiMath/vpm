/** Socket address first, then nonempty X-Forwarded-For entries from right to left.
 * Trims surrounding ASCII spaces/tabs; does not validate IPs or establish trust.
 */
declare function forwarded(request: forwarded.Request): forwarded.Addresses;
declare namespace forwarded {
  interface Headers {
    readonly 'x-forwarded-for'?: string | undefined;
    readonly [name: string]: string | readonly string[] | undefined;
  }
  interface Socket {
    /** Can be undefined after a socket is destroyed. */
    readonly remoteAddress?: string | undefined;
  }
  type Request = { readonly headers: Headers } & (
    | { readonly socket: Socket; readonly connection?: Socket | undefined }
    | { readonly socket?: null | undefined; readonly connection: Socket }
  );
  type Addresses = [string | undefined, ...string[]];
}
export = forwarded;
