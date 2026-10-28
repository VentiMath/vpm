import forwarded = require('vforwarded');

/** Return the furthest address reached before an untrusted hop. */
declare function proxyaddr(request: proxyaddr.Request, trust: proxyaddr.Trust): string | undefined;
declare namespace proxyaddr {
  type Request = forwarded.Request;
  type Addresses = forwarded.Addresses;
  /** Called socket-first, excluding the furthest address. Truthiness is used. */
  type TrustFunction = (address: string | undefined, index: number) => unknown;
  type Trust = string | readonly string[] | TrustFunction;
  /** Invalid/nonstring candidates return false. The optional hop is ignored. */
  type CompiledTrust = (address: unknown, index?: number) => boolean;
  /** With omitted/null trust, return the complete extracted chain. */
  function all(request: Request, trust?: Trust | null): Addresses;
  /** Snapshot IPs, CIDRs, IPv4 netmasks and named ranges into a trust predicate. */
  function compile(trust: string | readonly string[]): CompiledTrust;
}
export = proxyaddr;
