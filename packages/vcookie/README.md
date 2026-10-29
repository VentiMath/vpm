# vcookie

Cookie and Set-Cookie header parsing and serialization, with modern APIs and
Express-compatible `parse` / `serialize` adapters. Zero runtime dependencies,
CommonJS and native ESM imports, and self-contained TypeScript declarations.

The consumer baseline is `cookie` 0.7.2, installed by Express 5.3.0. The four
modern APIs follow `cookie` 2.0.1. This is a low-level header utility: it does not
sign cookies, manage sessions, or implement a browser cookie jar.

## Usage

```js
const cookie = require('vcookie');
// Also: import { parseCookie, stringifySetCookie } from 'vcookie';

cookie.parseCookie('sid=abc; theme=light%20blue');
// [Object: null prototype] { sid: 'abc', theme: 'light blue' }

cookie.stringifySetCookie({
  name: 'sid', value: 'abc', path: '/', httpOnly: true,
  secure: true, sameSite: 'lax', maxAge: 3600,
});
// sid=abc; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax

cookie.stringifyCookie({ sid: 'abc', theme: 'light blue' });
// sid=abc; theme=light%20blue

cookie.parseSetCookie('sid=abc; Path=/; HttpOnly');
// { name: 'sid', value: 'abc', path: '/', httpOnly: true }

// Express's existing calls keep their encoding and attribute order:
cookie.serialize('sid', 'a/b', { path: '/' }); // sid=a%2Fb; Path=/
cookie.parse('sid="abc"'); // [Object: null prototype] { sid: 'abc' }
```

VPM packages are currently consumed from this workspace or packed archives;
this change does not publish to npm or change application installations.
From the repository root:

```sh
cd packages/vcookie
bun pm pack --ignore-scripts
# Install the resulting archive with npm or Bun in your consumer project.
```

## API and compatibility

| Function | Behavior |
| --- | --- |
| `parse(header, options?)` | Legacy request parser. Removes paired surrounding quotes, preserves the first occurrence, and falls back to the raw value if a custom decoder throws. |
| `serialize(name, value, options?)` | Legacy response serializer. Uses `encodeURIComponent`, the 0.7 character rules, and 0.7.2's attribute coercion: falsy attributes are omitted, flags are truthy checks, and `maxAge` is numerically coerced and floored. |
| `parseCookie(header, options?)` | Modern request parser. Preserves quotes. The first decoded value wins; `undefined` permits a later occurrence to retry. Custom decoder errors propagate. |
| `stringifyCookie(cookies, options?)` | Modern request serializer. Uses own enumerable keys, skipping values that are `undefined`. |
| `parseSetCookie(header, options?)` | Parses one response field. Recognizes case-insensitive attributes, ignores unknown or invalid attributes, and lets later valid attributes replace earlier ones. |
| `stringifySetCookie(cookie, options?)` | Modern response serializer. Takes `{ name, value?, ...attributes }`; missing or null values produce an empty value. |

Both request parsers return a fresh map with a **null prototype**. Names are
case-sensitive. They trim only spaces and tabs, retain malformed percent escapes,
preserve `+` literally, and skip bare tokens without an equals sign. Parsing is
intentionally permissive, matching upstream header recovery; it is not a header
validator. Pass multiple `Set-Cookie` fields separately, never comma-join them.

Parsing options accept `decode(value): string | undefined`. Serialization options
accept `encode(value): string`. The modern default encoder preserves the same
roundtrip-safe ASCII characters as 2.0.1 and uses `encodeURIComponent` otherwise;
the legacy default always uses `encodeURIComponent`. For example, modern APIs
retain `a/b`, while `serialize` emits `a%2Fb`. Modern name and raw-value character
rules are also broader, matching 2.0.1. Lone surrogates still throw `URIError`
during default encoding. A custom encoder's result is always validated.

Response attributes are `maxAge` (seconds), `domain`, `path`, `expires` (Date),
`httpOnly`, `secure`, `partitioned`, `priority` (`low`, `medium`, `high`) and
`sameSite` (`lax`, `strict`, `none`, or boolean). String enum values are
case-insensitive at runtime. `sameSite: true` means Strict; false omits it.
Attributes retain upstream's output order. This utility leaves cookie prefix,
SameSite/Secure, Partitioned/Secure and origin policy decisions to the caller.

Intentional differences from the baselines:

- **Isolated maps.** 0.7.2 uses a normal object and loses an own `__proto__`
  cookie. 2.0.1 protects that name, but its results share a mutable custom
  prototype: changing it can affect later parses. VPM has no shared prototype.
- **One read per option.** A getter cannot provide one value for validation
  and a different value for output. Both old and current upstream repeatedly
  read fields. The tests reproduce current upstream accepting an injected Path
  attribute through a changing getter.
- **Genuine dates.** Expiration uses captured `Date.prototype` methods, accepts
  Dates from other realms, and rejects invalid or spoofed Dates. Overridden
  `valueOf`/`toUTCString` methods cannot supply unchecked expiration text.
- **Explicit types in the modern API.** Names, values, encoded results, and
  `stringifySetCookie` domains and paths must be strings; its flags must be
  booleans. Inputs/options must have the documented shape; arrays and
  nonfunction callbacks are rejected even on empty input. Options may be null or
  omitted. Custom decoders may return a string or undefined, not arbitrary
  objects. Legacy `serialize` keeps 0.7.2's attribute coercion, which Express
  applications rely on: a null, empty or false attribute is omitted, a truthy
  flag such as `secure: 1` is emitted, and a truthy domain or path is used as its
  string, still validated.
- **Exact ages.** Serialized ages must be safe integers; legacy ages are first
  coerced and floored as 0.7.2 does, so `'3600'` works. Infinities, NaN and
  unsafe numbers are rejected. Modern serialization rejects fractions and
  numeric strings. Parsing ignores unsafe/infinite ages instead of rounding them
  or returning Infinity.
- **Private error text.** Built-in validation errors do not interpolate cookie
  values or options. Exceptions deliberately thrown by custom callbacks retain
  their normal modern/legacy behavior; their messages remain the caller's.

These changes harden configuration handling; they do not establish an externally
exploitable vulnerability in upstream applications. The familiar legacy API
preserves Express output, including its option coercion. The
legacy adapters deliberately target 0.7.2 semantics, not the changed aliases in
1.1.1. Use the four modern function names for the current API.

## Verification

22 focused tests cover all six APIs, legacy and current differential cases,
1,500 generated headers, every byte in encoded/raw values, ASCII name/domain/path
boundaries, Unicode and malformed escapes, duplicate semantics, prototype
isolation, getter substitution, genuine/cross-realm Dates, secret-free errors,
large headers, age overflow, and CJS/ESM imports.

The shared integration gate aliases `cookie` 0.7.2 to `vcookie` and runs
HTTP checks through Express 5.3.0, Functions Framework 5.0.2 and
Firebase Functions 7.4.0 on Node 24.22.1 and Bun 1.4.0. Cookie checks include
plain, Unicode, JSON, signed and custom-encoded values, all attributes,
Express's millisecond-to-second age conversion, clearing cookies, duplicate
request values, and invalid serialization producing no Set-Cookie field.
Cookie signing now uses the separate [`vcookie-signature`](../vcookie-signature)
replacement in the shared gate; it is not a dependency of `vcookie`.

Packed-archive checks install with both npm and Bun and exercise Node/Bun CJS
and ESM consumers plus strict TypeScript 7.0.2 without Node, Undici or DOM ambient
types. Archives contain only the implementation, declarations, license, README,
package metadata and provenance. Fixtures and benchmarks stay in the repository.

```sh
node --test packages/vcookie/test/*.test.cjs
bun test packages/vcookie/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
bun run check:docs
```

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

Recorded 2026-10-27 on macOS arm64, Node 24.22.1 and Bun 1.4.0. These are
individual function calls, **not application throughput measurements**. Express
uses the legacy serializer; its ordinary path option is effectively tied with
upstream in this run. Legacy parsing is slower: roughly 1–11% on Node and
11–22% on Bun. Modern Node parsing is also generally slower; modern Bun
serialization benefits most. This package's principal gains are correctness and
API coverage, not a demonstrated application speedup.

The harness checks equal output before timing, warms the whole corpus and each
case, consumes results, and records nine alternating-order samples. Medians are
shown in nanoseconds per call; lower is better. Ordinary cases use 50,000 calls
per sample, malformed escape cases 5,000, and 50-cookie cases 10,000. Values close
to parity should be treated as noise rather than a reliable improvement.

| Baseline | Case | Node upstream → VPM | Bun upstream → VPM |
| --- | --- | ---: | ---: |
| 0.7.2 | parse one cookie | 124 → 135 | 89 → 106 |
| 0.7.2 | parse five cookies | 482 → 536 | 328 → 376 |
| 0.7.2 | parse encoded | 410 → 423 | 263 → 292 |
| 0.7.2 | parse duplicate | 333 → 347 | 247 → 297 |
| 0.7.2 | parse malformed escape | 4671 → 5022 | 624 → 705 |
| 0.7.2 | parse 50 cookies | 5559 → 5601 | 4011 → 4890 |
| 2.0.1 | parse one cookie | 118 → 135 | 104 → 98 |
| 2.0.1 | parse five cookies | 473 → 535 | 350 → 353 |
| 2.0.1 | parse encoded | 405 → 422 | 271 → 267 |
| 2.0.1 | parse duplicate | 326 → 341 | 255 → 251 |
| 2.0.1 | parse malformed escape | 4415 → 5133 | 695 → 635 |
| 2.0.1 | parse 50 cookies | 5743 → 5632 | 4279 → 4208 |
| 0.7.2 | serialize plain | 113 → 111 | 79 → 75 |
| 0.7.2 | serialize Unicode | 190 → 192 | 115 → 112 |
| 0.7.2 | serialize Express defaults | 148 → 148 | 111 → 111 |
| 0.7.2 | serialize all attributes | 687 → 655 | 288 → 294 |
| 2.0.1 | stringify Set-Cookie plain | 81 → 89 | 74 → 59 |
| 2.0.1 | stringify Set-Cookie Unicode | 204 → 210 | 139 → 120 |
| 2.0.1 | stringify Set-Cookie attributes | 619 → 610 | 248 → 246 |
| 2.0.1 | stringify Cookie five values | 418 → 409 | 255 → 168 |
| 2.0.1 | parse Set-Cookie plain | 77 → 80 | 76 → 69 |
| 2.0.1 | parse Set-Cookie attributes | 796 → 795 | 811 → 827 |

[Harness](bench/compare.cjs), [Node samples](bench/node24.json), and
[Bun samples](bench/bun14.json) record source, baseline and harness hashes,
runtime versions, sample counts and checksums. Reproduce from the repository root,
running runtimes sequentially on an otherwise quiet machine:

```sh
OUTPUT=/tmp/vcookie-node.json node packages/vcookie/bench/compare.cjs
OUTPUT=/tmp/vcookie-bun.json bun packages/vcookie/bench/compare.cjs
```

## Origin and license

Derived from [jshttp/cookie](https://github.com/jshttp/cookie), MIT licensed;
upstream copyright notices are retained. [Provenance](PROVENANCE.json) records
release commits, registry archive URLs/integrities and SHA-256 source hashes.
The downloaded archives were verified against npm's SHA-512 integrity values.
Unmodified 0.7.2 and 2.0.1 source fixtures serve as the compatibility/performance
baselines; 1.1.1 additionally checks modern parsing behavior. Their licenses are
retained beside the fixtures. No upstream development dependencies are installed
by this package.
