# vcookie-signature

A compatible replacement for `cookie-signature` 1.2.2. Signs and verifies cookie
values with native HMAC-SHA256, preserving existing signatures and the familiar
`sign` / `unsign` API. Zero external runtime dependencies, CommonJS and native
ESM imports, and self-contained TypeScript declarations.

```js
const { sign, unsign } = require('vcookie-signature');
// Also: import { sign, unsign } from 'vcookie-signature';

const signed = sign('session-value', 'example-key');
unsign(signed, 'example-key'); // 'session-value'
unsign(signed, 'different-key'); // false
```

The output is `value.signature`: standard base64 HMAC-SHA256 without its final
padding character. Dots inside the value are preserved. Verification returns the
original string, including `''` for a valid empty value, or `false` for a mismatch.
This utility authenticates a value; it does not encrypt it, add cookie attributes,
or implement sessions. Express adds its own `s:` prefix outside this API.

## What changes

- Verification compares only the **43-byte encoded signature** with native
  `crypto.timingSafeEqual`. Upstream reconstructs and UTF-8 encodes two copies
  of the entire `value.signature` for comparison. Payload hashing remains
  proportional to payload size; comparison buffers no longer are.
- Missing delimiters, wrong signature lengths, and non-ASCII signature text
  reject before hashing the payload. Invalid argument/key configuration still
  throws even when the signed input is malformed.
- Exact encoded-byte comparison preserves rejection of padded base64, URL-safe
  substitutions and nonzero padding bits. It never relies on permissive base64
  decoding or truncates Unicode characters into matching ASCII bytes.
- Signing removes SHA-256's known single padding character with `slice`, avoiding
  a general-purpose regular-expression replacement.
- The exports are frozen, so replacing the public `sign` property cannot change
  verification behavior. Declaration files describe the false-or-string result
  and native key shapes without requiring separate Node or DOM type packages.

The cryptographic algorithm and valid wire format are unchanged. Upstream already
uses timing-safe comparison; VPM retains that property for the signature bytes,
not a promise that the entire function takes constant time. Public format checks,
key setup and hashing take different amounts of time for different inputs.
No stronger cryptographic security claim is made.

## Arguments and keys

Both functions require a primitive string value and a non-null secret. Native
crypto validates secrets: strings, Buffer/typed-array/DataView byte views,
ArrayBuffer/SharedArrayBuffer, secret KeyObjects and supported CryptoKeys.
Typed-array offsets and lengths are honored. Asymmetric KeyObjects and arbitrary
records throw. Empty values and empty keys retain upstream behavior; key policy
belongs to the caller.

Genuine CryptoKeys are converted through `KeyObject.from` instead of passed
directly to the deprecated `createHmac` overload. Non-extractable CryptoKey
conversion follows the host runtime's policy; Node 24.22.1 and Bun 1.4.0 currently
accept it with a deprecation warning. String, byte and KeyObject inputs avoid
that path. Keys and results are not cached. TypeScript key interfaces are
structural descriptions; native crypto remains responsible for authenticity.

## Verification

12 focused tests include an independent
[RFC 4231 HMAC-SHA256 vector](https://www.rfc-editor.org/rfc/rfc4231.html#section-4.2),
1,000 generated values, upstream cross-verification, tampering at every signature
position, malformed/base64 alias rejection, Unicode truncation attempts, empty
and dotted values, byte-view offsets, cross-realm arrays, native key objects,
invalid keys and CJS/ESM exports. An instrumented test verifies that valid-format
matches and mismatches both reach native `timingSafeEqual` with 43-byte buffers,
including a 100,000-character value.

The shared gate aliases Express's signing calls to VPM and verifies real HTTP
cookies, including tampered and padded signatures. Both packages added in this
change run in **159 HTTP checks** through Express 5.3.0, Functions Framework 5.0.2
and Firebase Functions 7.4.0 on Node 24.22.1 and Bun 1.4.0. Signature expectations
also use an unaliased upstream fixture. Packed archives install under npm and
Bun, pass Node/Bun CJS/ESM checks, and compile with strict TypeScript 7.0.2 without
Node, Undici or DOM ambient types.

```sh
node --test packages/vcookie-signature/test/*.test.cjs
bun test packages/vcookie-signature/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

## Benchmarks

Recorded 2026-10-27 on macOS arm64 with Node 24.22.1 and Bun 1.4.0, against the
unmodified 1.2.2 fixture. Nine alternating-order samples, equal-output checks,
whole-corpus and per-case warmup, and consumed results. Medians are nanoseconds
per call; lower is better. Ordinary cases use 10,000 calls per sample, 4 KiB
cases 5,000 and 64 KiB cases 1,000.

Short verification takes about **6% less time on Node and 11% less on Bun**;
4 KiB verification takes **42% / 35% less**. Short signing improvements are
smaller, and Node KeyObject signing is effectively tied. The 64 KiB inputs are
stress cases, not representative browser cookie sizes. Large malformed inputs
show the effect of skipping payload work, not normal authentication throughput.
These are microbenchmarks; no application speedup is established.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| sign short, string key | 1532 → 1479 | 827 → 779 |
| sign short, KeyObject | 1476 → 1479 | 693 → 608 |
| sign Unicode | 1600 → 1523 | 812 → 720 |
| sign 4 KiB | 3357 → 3309 | 3056 → 2982 |
| verify short, string key | 1779 → 1664 | 1123 → 1005 |
| verify short, KeyObject | 1747 → 1686 | 1002 → 878 |
| verify Unicode | 1994 → 1762 | 1143 → 1106 |
| verify 4 KiB | 6092 → 3534 | 5110 → 3314 |
| verify 64 KiB | 93251 → 31682 | 58539 → 35487 |
| reject wrong key | 1886 → 1726 | 1085 → 1011 |
| reject malformed short | 2074 → 1204 | 1079 → 416 |
| reject malformed 64 KiB | 88761 → 937 | 57116 → 388 |

[Harness](bench/compare.cjs), [Node samples](bench/node24.json) and
[Bun samples](bench/bun14.json) include hashes, runtime versions, all samples,
counts and checksums. Reproduce sequentially from the repository root:

```sh
OUTPUT=/tmp/vcookie-signature-node.json node packages/vcookie-signature/bench/compare.cjs
OUTPUT=/tmp/vcookie-signature-bun.json bun packages/vcookie-signature/bench/compare.cjs
```

## Distribution and provenance

VPM packages currently install from the workspace or packed archives; this change
does not publish to npm or alter application installations. Run `bun pm pack
--ignore-scripts` in `packages/vcookie-signature`, then install the resulting archive with npm
or Bun. Archives contain only source, declarations, metadata, README, license and
provenance. Test fixtures and benchmarks stay in the repository.

Derived from [`cookie-signature`](https://www.npmjs.com/package/cookie-signature) under MIT; original copyright notices are retained in
[LICENSE](LICENSE). [Provenance](PROVENANCE.json) records the exact release commit,
registry archive integrity and SHA-256 fixture hash. The archive was verified
against npm's SHA-512 integrity before extracting the unmodified comparison
fixture; its license is also retained beside it. No upstream development
dependencies are installed by this package.
