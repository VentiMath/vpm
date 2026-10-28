# vproxy-addr

Select a request's client address using an explicit proxy-trust policy. Replaces
`proxy-addr` 2.0.8 with compiled numeric rules and a complete VPM dependency tree:
[vforwarded](../vforwarded) extracts the chain, and [vipaddr](../vipaddr) validates
address syntax. There are two direct and two total runtime dependencies.

```js
const proxyaddr = require('vproxy-addr');
// Also: import proxyaddr, { all, compile } from 'vproxy-addr';

// Compile once when configuring the application.
const trust = proxyaddr.compile(['loopback', '10.0.0.0/8']);
const request = {
  socket: { remoteAddress: '127.0.0.1' },
  headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
};
proxyaddr(request, trust);     // '198.51.100.7'
proxyaddr.all(request, trust); // ['127.0.0.1', '10.0.0.1', '198.51.100.7']
```

## Improvements

- **One parse per candidate.** The caller uses `vipaddr`'s validated public
  parsers directly. Upstream validates and then parses again. VPM avoids address
  instances, copied public state, and repeated prefix validation on the request
  path; its private rules were already validated at compilation.
- **Prepared numeric comparisons.** IPv4 rules become packed masks and network
  values. IPv6 rules retain their full-word count and partial-word comparison.
  Rules are separated by family, and a plain IPv4 candidate can be rejected
  immediately when the policy contains only native IPv6 rules.
- **Direct mapped matching.** Valid mapped subnets become IPv4 rules once.
  Mapped candidates use their final two words directly, without conversion
  objects or formatting and reparsing.
- **Complete zero-prefix support.** `/0` and the IPv4 zero netmask are accepted.
  Upstream rejects these valid prefixes. IPv4 and native IPv6 remain separate
  policy families, as described below.
- **Strict, isolated configuration.** Arrays are read without calling their
  `slice`, iterator or species hooks. Their length and each entry are read once;
  inherited entries, holes and nonstrings are rejected. The resulting policy
  contains private numeric values and cannot change when the input array changes.
  Prefix syntax consumes the entire suffix, including rejecting trailing newlines.
- **VPM extraction and parsing.** HTTP tab whitespace, own-header lookup and
  snapshotted request fields come from `vforwarded`. Complete IP validation,
  preserved IPv4-compatible IPv6 bits and documented legacy IPv4 forms come
  from `vipaddr`. These benefits are inherited, not new caller implementations.

## API and trust semantics

`proxyaddr(request, trust)` returns the furthest reached string, or undefined
when the selected socket address is unavailable. Trust is required: a compiled
or custom callback, a single configuration string, or an array of strings.
Passing raw configuration compiles it on every call; retain a compiled predicate
for repeated requests. Booleans and hop-count numbers are Express settings, not
arguments to this package. Express converts those settings to callbacks first.

`all(request, trust?)` returns a fresh mutable array, socket first, then nonempty
`X-Forwarded-For` entries from right to left. Omitted or null trust returns the
entire extracted chain. With trust, traversal stops at the first untrusted hop
and **includes that hop**. Nothing farther away is selected. The furthest entry
is never passed to the predicate, so a one-address request never calls it.

Custom callbacks receive `(address, index)`, with index zero for the socket.
The socket address can be undefined. Callback results use ordinary synchronous
truthiness, matching upstream; Promises are not awaited. Callbacks receive
original text, may accept opaque tokens, and exceptions propagate unchanged.
The header/socket chain is extracted before callbacks run, so later request
mutations do not change the current traversal. A selected client string need not
be a valid IP; compiled policies validate only the intervening hops they examine.

`compile(configuration)` returns a predicate `(address, index?) => boolean`.
It ignores the optional index and returns false for malformed or nonstring
candidates without coercion. An empty array compiles to a predicate that always
returns false. Configuration accepts:

- Literal IPv4 or IPv6 addresses, with `/32` or `/128` implied.
- CIDRs, with decimal prefixes from 0–32 or 0–128. Host bits are masked out.
- IPv4 netmasks, such as `10.0.0.0/255.0.0.0`, with contiguity checked by
  `vipaddr`. Valid dotted legacy numeric forms and hexadecimal masks also work.
- The case-sensitive names `loopback`, `linklocal` and `uniquelocal`, retaining
  upstream's networks: `127.0.0.0/8` and `::1/128`; `169.254.0.0/16` and
  `fe80::/10`; and `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`.

Configuration strings do not trim whitespace or split comma-separated lists.
Those transformations belong to Express's setting parser. Invalid configuration
throws TypeError. Getter/proxy errors propagate. The module export is frozen;
compiled functions remain ordinary functions with private configuration.

### IPv4 and IPv6 boundaries

Mapped addresses (`::ffff:192.0.2.1`) are treated as their IPv4 equivalents.
Mapped subnet prefixes **at least 96** become IPv4 prefixes after subtracting
96: `::ffff:10.0.0.0/104` equals `10.0.0.0/8`. Mapped prefixes below 96 grant
no trust to either family, preserving the safeguards already in upstream 2.0.8.
Native IPv6 never matches a mapped rule, and IPv4/mapped candidates never match
a native IPv6 rule, even a broad `::/0`.

Consequently, `0.0.0.0/0` trusts any valid IPv4 or mapped address; `::/0` trusts
any valid native IPv6 address. Both rules are needed to cover both families.
`::192.0.2.1` preserves its actual bits and remains native IPv6. Scoped IPv6
uses `vipaddr`'s zone grammar; matching compares address bits and ignores zones,
as upstream does.

### Intentional compatibility changes

VPM adds zero prefixes/netmasks and rejects a trailing newline in a numeric
prefix. `all(request, false)`, `all(request, 0)`, `all(request, '')` and other
invalid policies throw instead of silently treating a falsy value as omitted
trust. `all(request)` and `all(request, null)` keep the original extraction
behavior. Array entries must be own strings; array holes and coercible objects
cannot become policy entries. Input methods such as `slice` are not invoked.
The address and header differences documented in the two dependencies also
apply, including tabs, inherited headers, strict malformed-input rejection,
current validated `inet_aton` forms, and preserved compatible-IPv6 bits.

## Verification

105 tests run on Node 24 and Bun: all 88 upstream tests retain their behavior
assertions, with 17 additional tests for full-input validation, callback order,
configuration snapshots, request reads, CJS/ESM identity and fixture integrity.
Independent BigInt checks cover all 33 IPv4 and 129 IPv6 prefixes, their network
and last-address boundaries and immediately outside neighbors, plus 7,140
generated candidate comparisons. Every mapped prefix below 96 is checked in
single- and multiple-rule policies. Another 3,000 generated requests/policies
are compared with original upstream and upstream using VPM dependencies, and
2,000 generated addresses check rule-order independence and upstream agreement.

The shared Express/Functions Framework gate replaces `proxy-addr` with
`vproxy-addr` and runs HTTP checks on each runtime. Checks cover
zero-prefix families, mapped-prefix guards, IPv4 netmasks, scoped IPv6 and an
untrusted middle hop. Archive checks install with npm and Bun, run Node/Bun
CommonJS and ESM consumers, verify the six-file package and two dependencies,
and compile TypeScript 7 consumers without platform ambient types.

```sh
node --test packages/vproxy-addr/test/*.test.cjs
bun test packages/vproxy-addr/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

The [harness](bench/compare.cjs) compares three complete paths:

1. Unmodified `proxy-addr` 2.0.8 with its original dependencies.
2. The same upstream caller using `vforwarded` and `vipaddr`.
3. `vproxy-addr` using those same two VPM dependencies.

The second comparison isolates the gains from this caller. Equal outputs are
checked before timing. Corrected tab handling compares only the two VPM-dependency
paths; the newly supported `/0` case is measured only for VPM. Each case has twelve
samples using all six implementation orders twice, corpus and case warmup, and
a 256-slot retention buffer. Timings include retention writes and exclude final
result consumption. Standard cases use 10,000 calls per sample; compilation and
100-hop traversal use lower counts recorded for each case. These are isolated
operations, not HTTP-throughput measurements.

```sh
OUTPUT=/tmp/vproxy-addr-node.json node packages/vproxy-addr/bench/compare.cjs
OUTPUT=/tmp/vproxy-addr-bun.json bun packages/vproxy-addr/bench/compare.cjs
```

Measurements recorded 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0.
Three fresh processes per runtime use the same source hashes and produce the
same consumed checksum. Raw runs: [Node 1](bench/node24.json),
[Node 2](bench/node24-repeat2.json), [Node 3](bench/node24-repeat3.json);
[Bun 1](bench/bun14.json), [Bun 2](bench/bun14-repeat2.json),
[Bun 3](bench/bun14-repeat3.json).

The tables show first-process medians in **nanoseconds per call**. A is original
upstream, B is upstream using VPM dependencies, and C is `vproxy-addr`. The final
column gives C/B across all three processes; **lower is better**, with 0.50
meaning half the time. A dash means there is no equivalent comparison.

### Node 24

| Operation | A: original | B: VPM dependencies | C: vproxy-addr | C/B, three runs |
| --- | ---: | ---: | ---: | ---: |
| compile literal IPv4 | 794.9 | 260.6 | 150.1 | 0.542–0.576 |
| compile IPv4 CIDR | 830.8 | 284.4 | 155.8 | 0.548–0.574 |
| compile IPv6 CIDR | 2,452.0 | 344.8 | 179.9 | 0.522–0.535 |
| compile mapped CIDR | 2,970.6 | 557.6 | 286.5 | 0.496–0.514 |
| compile named ranges | 12,302.3 | 2,783.3 | 1,321.8 | 0.472–0.475 |
| compile 100 IPv4 rules | 97,105.2 | 33,960.1 | 19,190.6 | 0.535–0.573 |
| trust empty policy | 5.9 | 5.9 | 5.9 | 0.992–1.014 |
| trust single IPv4 | 703.4 | 214.6 | 107.7 | 0.500–0.537 |
| trust single IPv6 | 2,717.8 | 223.3 | 107.7 | 0.472–0.482 |
| trust mapped candidates | 3,174.2 | 444.5 | 220.9 | 0.488–0.497 |
| trust mapped policy | 2,843.9 | 320.6 | 146.0 | 0.455–0.463 |
| trust native IPv6 vs IPv4 policy | 2,634.5 | 193.1 | 99.0 | 0.501–0.513 |
| trust IPv4 vs IPv6 policy | 727.9 | 213.4 | 13.5 | 0.060–0.063 |
| trust named ranges | 2,290.2 | 316.6 | 136.4 | 0.428–0.437 |
| trust 100 rules last match | 1,492.1 | 1,697.3 | 210.0 | 0.123–0.124 |
| reject invalid candidates | 23,291.2 | 51.6 | 53.0 | 0.922–1.027 |
| select socket only | 93.0 | 24.3 | 22.7 | 0.933–0.954 |
| select one header address | 877.9 | 295.1 | 180.0 | 0.600–0.610 |
| select three trusted proxies | 2,730.6 | 889.6 | 498.8 | 0.561–0.572 |
| stop at untrusted socket | 1,123.8 | 406.8 | 259.6 | 0.607–0.638 |
| stop at untrusted middle hop | 2,920.4 | 954.2 | 537.6 | 0.558–0.567 |
| stop at malformed hop | 18,213.4 | 712.7 | 441.5 | 0.619–0.645 |
| select mixed IPv6 chain | 10,163.6 | 932.2 | 507.1 | 0.532–0.548 |
| select mapped IPv6 chain | 7,170.0 | 1,118.2 | 596.2 | 0.530–0.533 |
| select 100 trusted hops | 100,168.5 | 28,834.7 | 15,065.4 | 0.522–0.526 |
| select with inline configuration | 8,687.8 | 1,910.3 | 1,018.8 | 0.533–0.543 |
| all addresses without trust | 210.6 | 137.8 | 136.0 | 0.982–1.066 |
| all addresses with trust | 2,888.8 | 947.5 | 535.8 | 0.555–0.571 |
| custom callback trust | 398.8 | 282.5 | 235.1 | 0.832–0.998 |
| unavailable socket address | 44,316.6 | 118.3 | 105.6 | 0.893–1.001 |
| HTTP tabs (corrected output) | — | 613.0 | 346.6 | 0.478–0.577 |
| zero-prefix IPv4 policy | — | — | 148.2 | — |

### Bun

| Operation | A: original | B: VPM dependencies | C: vproxy-addr | C/B, three runs |
| --- | ---: | ---: | ---: | ---: |
| compile literal IPv4 | 721.6 | 203.7 | 173.1 | 0.793–0.896 |
| compile IPv4 CIDR | 841.8 | 266.5 | 183.5 | 0.628–0.806 |
| compile IPv6 CIDR | 1,838.9 | 320.7 | 239.3 | 0.613–0.746 |
| compile mapped CIDR | 2,499.4 | 540.8 | 355.9 | 0.642–0.743 |
| compile named ranges | 11,751.4 | 2,670.6 | 1,530.0 | 0.494–0.573 |
| compile 100 IPv4 rules | 80,642.5 | 24,406.3 | 17,361.4 | 0.683–0.711 |
| trust empty policy | 5.5 | 5.5 | 5.5 | 1.000–1.120 |
| trust single IPv4 | 619.2 | 156.0 | 75.2 | 0.482–0.513 |
| trust single IPv6 | 2,222.8 | 231.5 | 113.7 | 0.412–0.491 |
| trust mapped candidates | 2,721.2 | 426.9 | 208.5 | 0.449–0.488 |
| trust mapped policy | 2,511.4 | 280.4 | 119.5 | 0.370–0.431 |
| trust native IPv6 vs IPv4 policy | 2,037.3 | 175.8 | 78.2 | 0.436–0.534 |
| trust IPv4 vs IPv6 policy | 1,953.6 | 288.8 | 13.7 | 0.047–0.089 |
| trust named ranges | 3,608.9 | 343.1 | 136.0 | 0.394–0.484 |
| trust 100 rules last match | 1,652.6 | 1,442.6 | 190.4 | 0.132–0.194 |
| reject invalid candidates | 1,088.2 | 47.1 | 48.4 | 0.950–1.027 |
| select socket only | 81.6 | 28.1 | 26.6 | 0.950–1.058 |
| select one header address | 817.5 | 204.9 | 120.6 | 0.531–0.589 |
| select three trusted proxies | 2,574.3 | 708.1 | 434.4 | 0.592–0.641 |
| stop at untrusted socket | 1,108.8 | 295.3 | 174.0 | 0.548–0.629 |
| stop at untrusted middle hop | 2,899.7 | 757.1 | 419.6 | 0.554–0.605 |
| stop at malformed hop | 2,570.8 | 564.2 | 399.8 | 0.632–0.709 |
| select mixed IPv6 chain | 9,542.7 | 889.7 | 541.0 | 0.577–0.608 |
| select mapped IPv6 chain | 6,744.6 | 1,058.7 | 521.5 | 0.493–0.534 |
| select 100 trusted hops | 96,143.2 | 24,644.7 | 13,843.7 | 0.562–0.563 |
| select with inline configuration | 8,274.7 | 1,794.6 | 1,027.5 | 0.573–0.661 |
| all addresses without trust | 139.9 | 115.7 | 110.9 | 0.682–0.985 |
| all addresses with trust | 2,923.3 | 753.5 | 445.3 | 0.578–0.591 |
| custom callback trust | 155.9 | 76.3 | 77.8 | 0.929–1.020 |
| unavailable socket address | 1,561.2 | 48.9 | 52.4 | 0.950–1.070 |
| HTTP tabs (corrected output) | — | 459.8 | 276.4 | 0.572–0.616 |
| zero-prefix IPv4 policy | — | — | 138.2 | — |

### What the comparisons show

Compared with **upstream already using VPM dependencies**, single IPv4, IPv6 and
mapped-candidate checks take **46–53% less time on Node and 49–59% less on Bun**.
The three-trusted-proxy traversal takes **43–44% less on Node and 36–41% less on
Bun**. Traversing 100 trusted hops takes **47–48% less on Node and about 44% less
on Bun**. The 100-rule case takes **88% less on Node and 81–87% less on Bun**;
this also removes the earlier `vipaddr` caller regression in that scenario.
Compilation takes **42–53% less on Node and 10–51% less on Bun** across the six
measured policies.

Relative to **original upstream with its original dependencies**, the
three-trusted-proxy traversal takes **81–82% less time on Node and 83–85% less on
Bun**. Those combined gains include earlier work in `vforwarded` and `vipaddr`;
they should not all be attributed to this caller.

Small operations are mixed. Empty policies, invalid candidates, callbacks,
unavailable sockets and extraction without a trust policy do not consistently
improve over B. Node's extraction-only case ranges from 2% faster to 7% slower
(up to 9 ns extra). Bun's empty-policy case is up to 12% slower (1.2 ns extra),
its unavailable-socket case up to 7% slower (3.4 ns), and its callback case up to
2% slower (1.5 ns). These small paths vary across processes; the numeric-rule
optimizations do not establish a speedup for every operation. No application
throughput or tail-latency improvement is inferred from these measurements.

## Distribution and provenance

Node.js 20+ package baseline; local verification targets Node 24 and Bun.
Use the workspace or `bun pm pack --ignore-scripts` in this directory and install
the archives of this package and its two VPM dependencies. These packages are
not yet published to npm. Test fixtures and benchmark results stay out of archives.

Derived from [proxy-addr 2.0.8](https://github.com/jshttp/proxy-addr/tree/v2.0.8)
under MIT; [LICENSE](LICENSE) preserves the upstream copyright notice.
[PROVENANCE.json](PROVENANCE.json) records the exact release commit, verified
registry archive integrity, fixture hash, upstream test source and dependency
fixtures. [Declarations](index.d.ts) describe the full public API.
