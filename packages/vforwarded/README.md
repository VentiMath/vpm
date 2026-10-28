# vforwarded

A replacement for `forwarded` 0.2.0 with correct HTTP whitespace handling,
single-read request fields, self-contained TypeScript declarations, and zero
runtime dependencies. Express uses it through `proxy-addr` for `req.ip`,
`req.ips`, and proxy-trust evaluation.

```js
const forwarded = require('vforwarded');
// Also: import forwarded from 'vforwarded';

forwarded({
  headers: { 'x-forwarded-for': '198.51.100.7,\t10.0.0.1' },
  socket: { remoteAddress: '127.0.0.1' },
});
// ['127.0.0.1', '10.0.0.1', '198.51.100.7']
```

## Contract and improvements

`forwarded(request)` returns a fresh, mutable array: the socket address first,
then nonempty `X-Forwarded-For` entries from right to left. Surrounding ASCII
spaces and tabs are removed; empty entries are skipped. The request, headers,
and socket are never mutated, so frozen inputs work. There is no result cache.

- **Complete HTTP whitespace handling.** Upstream trims spaces but retains
  tabs, including tab-only entries. VPM handles both characters in HTTP optional
  whitespace, as defined by [RFC 9110 §5.6.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.3).
  Internal whitespace and other characters are retained.
- **One output array.** Addresses are appended directly to the result. Native
  comma searches skip complete token spans; no temporary list or concatenation
  is needed. Trailing whitespace and empty entries are skipped together.
- **Stable request reads.** The headers object, own header value, selected
  socket/connection, and remote address are each read at most once. Upstream
  reads a present `request.socket` twice, which can observe different values
  from an accessor. A present socket prevents reads of the legacy connection.
- **Explicit input checks.** Header values must be strings or undefined, and
  socket addresses must be strings or undefined. Invalid values throw TypeError
  without coercion. Inherited header properties cannot inject addresses.

This helper extracts a chain; it does **not** validate IP syntax, normalize
addresses, resolve names, remove duplicate addresses, or establish which proxies
to trust. Header entries are untrusted input. The caller must apply its trust
policy before treating an entry as a client address. Ports, quoted text, unknown
tokens, internal whitespace, and Unicode whitespace remain opaque. The separate
standard `Forwarded` header is not parsed.

The request must provide an object-valued `headers` and either `socket` or the
legacy `connection`. Only an **own, lowercase** `x-forwarded-for` field is used,
matching Node's incoming headers. `socket` takes precedence; null or undefined
falls back to `connection`. A selected socket with an unavailable `remoteAddress`
contributes undefined at index zero, matching upstream's result. Types express
this as `[string | undefined, ...string[]]`.

Intentional differences from upstream are tab trimming, ignoring inherited
headers, single-read accessors, and rejecting malformed inputs that upstream
sometimes silently ignores (such as false, zero, null, or arrays used as the
header). Exceptions from getters and proxy traps propagate unchanged. The
exported function is frozen; returned arrays remain mutable.

## Verification

16 focused tests include 10,000 generated headers checked against upstream or
an independent whitespace parser, long chains/tokens, empty entries, IPv4/IPv6
text, opaque tokens, inherited headers, changing getters, thrown accessor/trap
errors, invalid values, frozen inputs, connection fallback, undefined socket
addresses, and CJS/ESM identity.

The shared integration gate uses `vforwarded` through `vproxy-addr`, replacing
`proxy-addr` 2.0.8 in Express 5.3.0. Eleven added HTTP checks cover `req.ip`/`req.ips`
with disabled,
unrestricted, hop-count and subnet trust; IPv4-mapped IPv6 proxies; stopping at
an untrusted hop; tab/empty entries; repeated header lines; and absent headers.
The full gate runs 190 HTTP checks on Node 24 and Bun. Archive checks install
with npm and Bun, exercise Node/Bun CJS/ESM consumers, verify the six-file package
contents, and compile TypeScript 7.0.2 consumers without platform ambient types.

```sh
node --test packages/vforwarded/test/*.test.cjs
bun test packages/vforwarded/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

## Benchmarks

Updated 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0. Three fresh
processes per runtime compare the verified, unmodified `forwarded` 0.2.0 fixture
with VPM. Each case has twelve alternating-order samples, corpus/case warmup,
equal-result checks, and consumption of every returned address. Normal cases
use 100,000 calls per sample, the 100-entry chain uses 10,000, and the two large
fields use 2,000. Tab handling is measured only for VPM because upstream returns
a different, incorrect result for that corpus.

Across the three runs, one-/two-address cases take **40–62% less time on Node**
and **16–52% less on Bun**. Missing/empty headers take **72–77% less on Node** and
**28–55% less on Bun**. The long opaque token takes **about 78% / 96% less**.
These are isolated parser timings, including result consumption, not evidence
of an application-throughput improvement.

Tradeoffs remain: Bun’s 100-entry chain takes **6–11% more time** (about 125 ns
extra in run 1). Its three-entry case ranges from **12% faster to 7% slower**
across runs. Node’s long whitespace-only field is essentially tied (within 3%).
Other ordinary comparison cases were faster in all three runs; small timing
differences should not be treated as universal gains.

First-run medians below are nanoseconds per call:

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| no forwarded header | 76 → 18 | 33 → 22 |
| empty header | 75 → 20 | 31 → 22 |
| one IPv4 address | 145 → 62 | 56 → 37 |
| one IPv6 address | 176 → 67 | 70 → 39 |
| two proxy entries | 163 → 95 | 65 → 55 |
| three proxy entries | 199 → 130 | 87 → 76 |
| ten proxy entries | 455 → 389 | 261 → 222 |
| 100 proxy entries | 3991 → 3733 | 2041 → 2166 |
| empty entries and spaces | 194 → 123 | 87 → 78 |
| legacy connection fallback | 120 → 56 | 49 → 37 |
| unavailable socket address | 124 → 54 | 98 → 81 |
| 16 KiB opaque token | 28363 → 6257 | 13379 → 472 |
| 8 KiB whitespace | 19850 → 19870 | 13869 → 8211 |
| tab whitespace (corrected output) | n/a → 311 | n/a → 104 |

[Harness](bench/compare.cjs), [Node run 1](bench/node24.json),
[run 2](bench/node24-repeat2.json), [run 3](bench/node24-repeat3.json),
[Bun run 1](bench/bun14.json), [run 2](bench/bun14-repeat2.json),
and [run 3](bench/bun14-repeat3.json) retain individual samples, medians,
runtime versions, timestamps, source/fixture/harness hashes, and checksums.

Reproduce sequentially, using fresh processes for repeats:

```sh
OUTPUT=/tmp/vforwarded-node.json node packages/vforwarded/bench/compare.cjs
OUTPUT=/tmp/vforwarded-bun.json bun packages/vforwarded/bench/compare.cjs
```

## Distribution and provenance

Node.js 20+ package baseline; local tests and measurements target Node 24 and Bun.
Install from this workspace, or run `bun pm pack --ignore-scripts` in
`packages/vforwarded` and install the archive using npm or Bun. VPM does not yet
publish these packages to npm. Archives include source, declarations, package
metadata, README, license and provenance; tests and benchmarks stay in the repo.

Derived from [forwarded](https://github.com/jshttp/forwarded/tree/v0.2.0) under
MIT. [LICENSE](LICENSE) preserves the upstream copyright notice.
[PROVENANCE.json](PROVENANCE.json) records the release commit, registry archive
integrity and SHA-256 of the unmodified comparison fixture. The registry archive
was verified against its SHA-512 integrity before extraction.
