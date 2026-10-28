/** Validated IP addresses and CIDR operations. No ambient platform types needed. */
export type Address = IPv4 | IPv6;
export type CIDR<T extends Address = Address> = readonly [T, number];
export type RangeList<T extends Address = Address> = Readonly<Record<string, CIDR<T> | readonly CIDR<T>[]>>;
export type IPv4Range = 'unicast' | 'unspecified' | 'broadcast' | 'multicast' | 'linkLocal' | 'loopback' | 'carrierGradeNat' | 'private' | 'reserved' | 'as112' | 'amt';
export type IPv6Range = 'unicast' | 'unspecified' | 'linkLocal' | 'multicast' | 'loopback' | 'uniqueLocal' | 'ipv4Mapped' | 'deprecatedSiteLocal' | 'discard' | 'deprecatedOrchid' | 'segmentRouting' | 'rfc6145' | 'rfc6052' | '6to4' | 'teredo' | 'reserved' | 'benchmarking' | 'amt' | 'as112v6' | 'orchid2' | 'droneRemoteIdProtocolEntityTags';
/** null and undefined select the default name, "unicast". */
export type DefaultResult<T> = string | Exclude<T, null | undefined>;

export class IPv4 {
  private readonly _ipv4Brand: void;
  constructor(octets: ArrayLike<number>);
  /** A fresh copy; changing it cannot change this address. */
  readonly octets: number[];
  readonly SpecialRanges: RangeList<IPv4>;
  kind(): 'ipv4';
  toString(): string;
  toNormalizedString(): string;
  toByteArray(): number[];
  toJSON(): { octets: number[] };
  match(other: IPv4, bits: number): boolean;
  match(cidr: CIDR<IPv4>): boolean;
  prefixLengthFromSubnetMask(): number | null;
  toIPv4MappedAddress(): IPv6;
  range(): IPv4Range;
  subnetMatch<T = undefined>(ranges: RangeList, defaultName?: T): DefaultResult<T>;
  static parser(input: unknown): number[] | null;
  static isIPv4(input: unknown): boolean;
  static isValid(input: unknown): boolean;
  static isValidFourPartDecimal(input: unknown): boolean;
  static isValidCIDR(input: unknown): boolean;
  static isValidCIDRFourPartDecimal(input: unknown): boolean;
  static parse(input: string): IPv4;
  static parseCIDR(input: string): [IPv4, number];
  static subnetMaskFromPrefixLength(bits: number): IPv4;
  static networkAddressFromCIDR(input: string): IPv4;
  static broadcastAddressFromCIDR(input: string): IPv4;
}

export class IPv6 {
  private readonly _ipv6Brand: void;
  /** Eight 16-bit parts or sixteen bytes; all values must be integers. */
  constructor(parts: ArrayLike<number>, zoneId?: string);
  /** A fresh copy; changing it cannot change this address. */
  readonly parts: number[];
  readonly zoneId: string | undefined;
  readonly SpecialRanges: RangeList<IPv6>;
  kind(): 'ipv6';
  toString(): string;
  toNormalizedString(): string;
  toFixedLengthString(): string;
  toRFC5952String(): string;
  toByteArray(): number[];
  toJSON(): { parts: number[]; zoneId?: string };
  match(other: IPv6, bits: number): boolean;
  match(cidr: CIDR<IPv6>): boolean;
  prefixLengthFromSubnetMask(): number | null;
  isIPv4MappedAddress(): boolean;
  toIPv4Address(): IPv4;
  range(): IPv6Range;
  subnetMatch<T = undefined>(ranges: RangeList, defaultName?: T): DefaultResult<T>;
  static parser(input: unknown): { parts: number[]; zoneId: string | undefined } | null;
  static isIPv6(input: unknown): boolean;
  static isValid(input: unknown): boolean;
  static isValidCIDR(input: unknown): boolean;
  static parse(input: string): IPv6;
  static parseCIDR(input: string): [IPv6, number];
  static subnetMaskFromPrefixLength(bits: number): IPv6;
  static networkAddressFromCIDR(input: string): IPv6;
  /** Last address in the subnet; IPv6 has no broadcast delivery. */
  static broadcastAddressFromCIDR(input: string): IPv6;
}

export function isValid(input: unknown): boolean;
export function isValidCIDR(input: unknown): boolean;
export function parse(input: string): Address;
export function parseCIDR(input: string): [IPv4, number] | [IPv6, number];
export function process(input: string): Address;
export function fromByteArray(input: ArrayLike<number>): Address;
export function subnetMatch<T = undefined>(address: Address, ranges: RangeList, defaultName?: T): DefaultResult<T>;
