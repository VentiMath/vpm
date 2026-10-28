# vipaddr

IP address parsing, formatting, subnet matching and special-range classification
with zero runtime dependencies. Replaces `ipaddr.js` 1.9.1 used by `proxy-addr`
2.0.8, and implements the current 2.5.0 API with the intentional differences below.

```js
const ipaddr = require('vipaddr');
// Also: import ipaddr, { IPv4, IPv6, parse } from 'vipaddr';

const address = ipaddr.parse('192.0.2.42');
address.match(ipaddr.parseCIDR('192.0.2.0/24')); // true
ipaddr.process('::ffff:192.0.2.42').toString();  // '192.0.2.42'
ipaddr.process('::192.0.2.42').kind();          // 'ipv6', preserving the bits
```

## Improvements

- **Parse once.** Character scanners validate and construct address parts in one
  pass. Predicates return false without constructing an address or an exception.
  Family dispatch avoids an unsuccessful IPv6 parse before each IPv4 CIDR parse.
- **Bounded, numeric prefix lengths.** `match()` and mask generation require
  finite integers in 0–32 or 0–128. Both comparison releases can report a match
  for an unrelated address when the prefix is NaN or negative; an infinite
  prefix can make their matching loop fail to terminate. VPM rejects these
  values before matching.
- **Validated, isolated address state.** Constructors require integer parts or
  bytes within range, copy the input, and read its length and each used element
  once. Sixteen-byte IPv6 inputs are checked before combining bytes. Fractions,
  strings, NaN and out-of-range bytes cannot enter the stored address. Public
  arrays are snapshots; changing them cannot change later matching results.
- **Direct mapped-address operations.** Checking the mapped `/96` prefix uses
  six numeric comparisons. Conversion works directly on the stored parts,
  without range-table scans or formatting and reparsing an address.
- **Preserve IPv6 bits.** `::192.0.2.1` is an IPv4-compatible IPv6 representation,
  distinct from `::ffff:192.0.2.1`. Upstream 2.5.0 inserts the mapped marker into
  the former; VPM preserves its actual bits and IPv6 family. `process()` converts
  only addresses containing the mapped marker.
- **Complete declarations.** Self-contained types cover validated constructors,
  family-specific matches, read-only state properties, parser results, zones,
  formatting, and all CIDR helpers. Both instance and global `subnetMatch` work;
  upstream 2.5.0 declares instance methods that its runtime does not implement.

## Contract and compatibility

Global functions are `parse`, `parseCIDR`, `isValid`, `isValidCIDR`, `process`,
`fromByteArray` and `subnetMatch`. `IPv4` and `IPv6` provide static parsing,
validation, mask generation, network-address and last-address calculations.
`broadcastAddressFromCIDR` retains the upstream method name for IPv6, where its
result is the last address in the subnet; IPv6 has no broadcast delivery.
See [the declarations](index.d.ts) for the complete API.

Default IPv4 parsing preserves the validated `inet_aton` forms in 2.5.0:
one to four components, decimal, leading-zero octal, and `0x`/`0X` hexadecimal.
For strict text, use `IPv4.isValidFourPartDecimal` or
`IPv4.isValidCIDRFourPartDecimal`: exactly four unpadded decimal components.
The 1.9.1 baseline lacks two-/three-component forms and mishandles uppercase
`0X` and some malformed octal inputs; VPM follows 2.5.0 here. This is an address
library, not a URL parser, and retaining legacy numeric forms is deliberate.

IPv6 accepts eight hexadecimal groups with optional `::` compression and a
strict four-component decimal dotted tail. Each hex group has at most four
digits; `::` must replace at least one group. Dotted tails reject octal, hex and
leading-zero octets. Zone identifiers use nonempty ASCII unreserved characters
(`A–Z`, `a–z`, digits, `_ . ~ -`), preserve case, and are not URI-decoded.
`%25en0` means the literal zone `25en0`. Matching compares address bits and ignores
zones, matching upstream; network/last-address helpers return an unscoped address.
Canonical IPv6 formatting compresses the longest zero run of at least two groups,
choosing the leftmost tie. It uses lowercase hex, including the final mapped parts.

All parsers consume the entire input, including rejecting trailing newlines.
`IPv4.parser`/`IPv6.parser` return validated parts or null, and
`isIPv4`/`isIPv6` fully validate bounds; upstream sometimes uses these APIs as
syntax-only checks. Predicates accept unknown values and return false for
non-strings. Parsing a non-string throws TypeError; invalid address/CIDR syntax
throws RangeError. CIDR text requires decimal digits after `/` and the family's
prefix bound. Numeric API prefixes are never coerced from strings.

`new IPv4(parts)` accepts four bytes. `new IPv6(parts, zoneId?)` accepts eight
16-bit parts or sixteen bytes. Both accept numeric array-like objects, including
typed arrays. `fromByteArray` accepts four or sixteen bytes. The `octets`, `parts`
and `zoneId` properties are read-only prototype getters over private state;
arrays returned by getters, `toByteArray` and `toJSON` are fresh mutable copies.
`JSON.stringify` preserves upstream's `{ octets }` / `{ parts, zoneId? }` shape.
Own-key enumeration, object spreading and descriptor reflection therefore differ
from upstream's mutable own properties. Classes remain extensible, and getter or
proxy-trap exceptions propagate. Static factories return the base family class,
as upstream does, even when called through a subclass or detached from the class.

`match` requires an address from the same family and the same loaded `vipaddr`
copy, plus a prefix or a two-element CIDR tuple. It does not match an IPv4 address
against an IPv6 address implicitly. `subnetMatch` accepts single tuples or lists
of tuples, considers own enumerable range names in order, skips valid subnets of
the other family, and rejects malformed entries it encounters. A custom fallback
value is returned unchanged; null or undefined selects `unicast`.

`SpecialRanges` reproduces the 2.5.0 data snapshot and precedence, with frozen
tables, tuples and address objects. `range()` uses an internal snapshot;
customization belongs in `subnetMatch`, not mutation of the built-in tables.
These labels are not a live IANA registry or a proxy-trust policy. The exported
module object is frozen. There are no runtime dependencies or global caches.

## Verification

87 tests: all 67 current upstream tests adapted for the documented differences,
plus 20 focused tests covering both verified comparison fixtures, invalid input,
constructor snapshots, accessor reads, CIDR validation, scoped addresses, mapped
and compatible IPv6, range-table integrity, CJS/ESM identity and detached methods.
Generated checks include 20,000 address round trips compared with Node's address
syntax and upstream bytes, ASCII substitutions checked against Node, every one
of 162 valid subnet masks, 5,000 subnet operations checked with independent BigInt
arithmetic, and 3,000 classifications compared with the 2.5.0 snapshot.

The integration gate loads `vipaddr` through the real `proxy-addr` 2.0.8 caller in
Express 5.3.0. Nine added HTTP checks cover IPv4/mapped subnet equivalence, native
IPv6 subnet boundaries, compatible-versus-mapped IPv6, family separation and
malformed proxy addresses. The shared gate runs **180 HTTP checks** on Node 24
and Bun. Archive checks install the package using npm and Bun, exercise both
runtimes' CommonJS/ESM imports, verify the eight-file archive and compile TypeScript
7.0.2 consumers without Node, Undici or DOM ambient declarations.

```sh
node --test packages/vipaddr/test/*.test.cjs
bun test packages/vipaddr/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

## Benchmarks

The [harness](bench/compare.cjs) compares the verified, unmodified 1.9.1 and 2.5.0
releases with VPM. It also loads the verified `proxy-addr` 2.0.8 source with each
address library and measures its unchanged compiled trust functions. Setup and
compilation are outside the timed loops. Equal results are checked first; the
corrected compatible-IPv6 case is measured only for VPM.

Each case uses twelve samples covering all six implementation orders twice,
warmup, and a 256-slot result-retention buffer to keep address allocations
observable. Timings include buffer writes and exclude final result consumption.
Parsing, validation, network-address helpers and caller checks use 10,000 calls
per sample; operations on in-memory values use 100,000. Results are isolated operation timings,
not evidence of application-throughput gains.

Measured 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0, with three
fresh processes per runtime. Compared with the caller's pinned **1.9.1**:

- IPv4 parsing uses **77–78% less time on Node and 82–83% less on Bun**;
  IPv6 parsing uses about **92% / 90% less**.
- The unchanged caller's IPv4 trust checks use **59–60% / 80–81% less time**;
  native IPv6 checks use about **89% / 91–92% less**, and mapped checks about
  **84% / 87% less**. These are compiled trust-function calls, not HTTP throughput.
- Conversion from sixteen bytes uses **69–70% / 40–41% less time**, while
  preserving byte validation and copying. It avoids a temporary sixteen-byte array.

Comparisons with **2.5.0** show the same broad gains: IPv4 parsing uses about
**82% / 84–85% less time**, IPv6 parsing about **93% / 90–91% less**,
and the three caller cases **70–91% / 82–93% less**.

Tradeoffs: direct constructors cost **33–40% more time on Node and 53–100% more
on Bun versus 1.9.1**, in exchange for integer checks and isolated state. Against
2.5.0, Node's IPv4 constructor is faster, but its IPv6 constructor takes
25–31% more time; Bun's constructors take 60–120% more. Node's already-parsed
matching takes roughly **8–14% more time** (about 1–2 ns). Bun's IPv6 match is
6–12% slower than 1.9.1 and 16% faster than 2.5.0. IPv4 formatting is effectively
tied across runs. The table retains those costs alongside the improvements.

First-run medians in nanoseconds per call, ordered **1.9.1 → 2.5.0 → VPM**:

| Case | Node 24 | Bun 1.4 |
| --- | ---: | ---: |
| parse IPv4 | 540 → 662 → 122 | 476 → 543 → 88 |
| validate IPv4 | 277 → 334 → 119 | 246 → 271 → 83 |
| parse IPv6 | 1636 → 1794 → 133 | 1149 → 1170 → 113 |
| validate IPv6 | 787 → 878 → 117 | 533 → 549 → 108 |
| reject invalid address | 18209 → 17360 → 67 | 1192 → 1228 → 57 |
| parse mapped IPv6 | 1942 → 2098 → 230 | 1811 → 1929 → 255 |
| process mapped IPv6 | 2269 → 2465 → 227 | 2520 → 2670 → 243 |
| parse IPv4 CIDR | 12059 → 8164 → 280 | 1191 → 1059 → 225 |
| parse IPv6 CIDR | 1213 → 1364 → 346 | 804 → 832 → 231 |
| construct IPv4 | 32 → 55 → 43 | 22 → 25 → 40 |
| construct IPv6 | 27 → 28 → 36 | 32 → 28 → 55 |
| match parsed IPv4 | 13 → 12 → 14 | 29 → 37 → 24 |
| match parsed IPv6 | 15 → 15 → 17 | 20 → 26 → 22 |
| mapped predicate | 242 → 290 → 12 | 348 → 396 → 12 |
| mapped to IPv4 | 221 → 240 → 20 | 313 → 312 → 28 |
| IPv4 to mapped | 1163 → 1290 → 19 | 898 → 919 → 27 |
| format IPv4 | 101 → 97 → 95 | 49 → 47 → 48 |
| format IPv6 RFC5952 | 349 → 410 → 125 | 369 → 394 → 144 |
| IPv6 to bytes | 33 → 33 → 26 | 56 → 56 → 41 |
| IPv6 from bytes | 78 → 77 → 23 | 65 → 60 → 39 |
| IPv4 mask prefix | 120 → 121 → 17 | 643 → 653 → 16 |
| IPv6 mask prefix | 397 → 404 → 23 | 609 → 593 → 24 |
| classify IPv4 | 173 → 177 → 49 | 221 → 210 → 72 |
| classify IPv6 | 118 → 124 → 42 | 159 → 159 → 54 |
| IPv4 network address | 521 → 600 → 283 | 483 → 471 → 234 |
| IPv6 network address | n/a → 1404 → 336 | n/a → 1174 → 282 |
| proxy-addr trust IPv4 | 922 → 1254 → 379 | 926 → 1023 → 187 |
| proxy-addr trust IPv6 | 3679 → 4139 → 392 | 3110 → 3627 → 260 |
| proxy-addr trust mapped | 3634 → 3844 → 585 | 3519 → 3458 → 452 |
| compatible IPv6 (preserved bits) | n/a → n/a → 200 | n/a → n/a → 206 |

[Node run 1](bench/node24.json), [run 2](bench/node24-repeat2.json),
[run 3](bench/node24-repeat3.json), [Bun run 1](bench/bun14.json),
[run 2](bench/bun14-repeat2.json), and [run 3](bench/bun14-repeat3.json) retain all
samples, medians, runtime versions, timestamps, source/fixture/harness hashes and
checksums. Repeat in fresh processes without other benchmark/test jobs running.

```sh
OUTPUT=/tmp/vipaddr-node.json node packages/vipaddr/bench/compare.cjs
OUTPUT=/tmp/vipaddr-bun.json bun packages/vipaddr/bench/compare.cjs
```

## Distribution and provenance

The package retains VPM's Node.js 20+ package baseline; local verification and
benchmarks target Node 24 and Bun. Use the workspace or pack an archive with
`bun pm pack --ignore-scripts` inside this directory. VPM has not published these
packages to npm.

Derived from [ipaddr.js](https://github.com/whitequark/ipaddr.js) under MIT.
[LICENSE](LICENSE) preserves its copyright notice.
[PROVENANCE.json](PROVENANCE.json) records both release archives, verified SHA-512
integrities, source SHA-256 hashes, exact upstream test source and adaptations,
and the comparison caller. The unmodified caller fixture has its own
[MIT license](test/fixtures/proxy-addr-2.0.8.LICENSE). Fixtures, tests and benchmarks
stay out of installable archives.
