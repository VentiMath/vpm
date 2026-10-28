import ipaddr, { IPv4, IPv6, parse, parseCIDR, fromByteArray, subnetMatch, type Address, type CIDR, type RangeList, type IPv6Range } from 'vipaddr';
import common = require('vipaddr');
const v4: IPv4 = new IPv4(new Uint8Array([127, 0, 0, 1]));
const v6: IPv6 = new IPv6(new Uint16Array(8), 'en-0');
const same: typeof IPv4 = common.IPv4;
const address: Address = parse('::1');
const cidr: CIDR = parseCIDR('::/0');
const mixed: RangeList = { local: [IPv4.parseCIDR('127.0.0.0/8'), IPv6.parseCIDR('::1/128')], one: [v4, 32] as const };
const name: string = v4.subnetMatch(mixed);
const numberDefault: string | 0 = subnetMatch(v6, mixed, 0 as const);
const boolDefault: string | false = v6.subnetMatch(mixed, false as const);
const nullDefault: string = subnetMatch(v6, mixed, null);
const objectDefault: string | { noMatch: true } = subnetMatch(v6, {}, { noMatch: true } as const);
const scoped: string | undefined = v6.zoneId;
const words: number[] = v6.parts;
const snapshot: { parts: number[]; zoneId?: string } = v6.toJSON();
const valid: boolean = ipaddr.isValid({});
const raw: { parts: number[]; zoneId: string | undefined } | null = IPv6.parser('::1');
const bytes: Address = fromByteArray(new Uint8Array(16));
const range: IPv6Range = v6.range();
const result: boolean = v6.match([v6, 128] as const);
const full: string = v6.toFixedLengthString();
const mask: IPv6 = IPv6.subnetMaskFromPrefixLength(64);
const net: IPv6 = IPv6.networkAddressFromCIDR('::1/64');
const last: IPv6 = IPv6.broadcastAddressFromCIDR('::1/64');
v4.match(v4, 32);
// @ts-expect-error match requires a prefix or a CIDR tuple
v4.match(v4);
// @ts-expect-error families must match
v4.match(v6, 32);
// @ts-expect-error families must match
v6.match([v4, 32]);
// @ts-expect-error input elements must be numeric
new IPv4(['127', 0, 0, 1]);
// @ts-expect-error numeric prefix required
IPv6.subnetMaskFromPrefixLength('64');
// @ts-expect-error state property is read-only
v4.octets = [1, 2, 3, 4];
// @ts-expect-error state property is read-only
v6.parts = [];
// @ts-expect-error zone property is read-only
v6.zoneId = 'new';
// @ts-expect-error cannot forge a nominal address from an object
const forged: IPv4 = { ...v4 };
// @ts-expect-error invalid tuple
subnetMatch(v6, { invalid: [v6] });
// @ts-expect-error numeric sentinel may be returned
const wrongDefault: string = subnetMatch(v6, mixed, 0);
void [same, address, cidr, name, numberDefault, boolDefault, nullDefault, objectDefault, scoped, words, snapshot, valid, raw, bytes, range, result, full, mask, net, last, forged, wrongDefault];
