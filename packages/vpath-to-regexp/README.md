# vpath-to-regexp

Parse route patterns, match request paths and generate URLs from parameters.
Replaces `path-to-regexp` 8.4.2, used by Express 5 through `router` 2.2.0.
Zero runtime dependencies; CommonJS, native ESM imports and TypeScript declarations.

```js
const { match, compile, parse, stringify, pathToRegexp, TokenData } = require('vpath-to-regexp');
// Also: import { match, compile } from 'vpath-to-regexp';

match('/users/:id')('/users/alice');
// { path: '/users/alice', params: { id: 'alice' } }
match('/files/*parts')('/files/a/b');
// { path: '/files/a/b', params: { parts: ['a', 'b'] } }
compile('/users/:id')({ id: 'a/b' }); // '/users/a%2Fb'
compile('/users{/:id}')({});         // '/users'
```

## Improvements

- **Span-based parsing.** Literal spans are sliced directly; identifiers use a
  Unicode-aware scan. Parsing avoids spreading the entire route into a character
  array and repeatedly appending ordinary text. Error offsets retain upstream's
  Unicode-code-point indexing.
- **Isolated compiled state.** Externally supplied token graphs are validated and
  copied once. Mutating a token, group, array or option after compilation cannot
  rename a match parameter or change a generated URL. Upstream closures retain
  token objects and observe those changes. Returned regex keys are detached too.
- **Lossless parameter names.** `stringify()` escapes quotes and backslashes using
  the route grammar. Upstream emits JSON escapes, so a newline in a name becomes
  the letter `n` after parsing. VPM preserves control characters and lone
  surrogates, and quotes names before Unicode identifier continuations outside
  the BMP or after empty text tokens.
- **Less request-path allocation.** Default decoding bypasses `decodeURIComponent`
  when no percent sign is present. Default wildcard decoding reuses the split
  array. Complete static matches avoid creating a regex capture array. URL
  templates use private token plans instead of a closure per token; constant
  templates avoid the missing-parameter array. Default URL encoding skips the
  native encoder only for its exact ASCII safe character set.
- **Explicit contracts.** Options, tokens, custom codec results and runtime inputs
  are validated. URL generation reads own parameter properties, snapshots wildcard
  lengths and reads each element once. Cyclic graphs and excessive nesting fail
  with useful errors. Alternative counts are checked before expansion.

The regular-expression lowering and backtracking guards are retained from 8.4.2.
VPM keeps its 256-alternative limit. These are upstream protections, not new VPM
security fixes. The upstream corpus verifies identical regex sources, flags and
capture ordering; adversarial-path checks exercise the same guards.

## API

`parse(path, options?)` returns mutable `TokenData` with `tokens` and
`originalPath`. Supported tokens are `{ type: 'text', value }`,
`{ type: 'param', name }`, `{ type: 'wildcard', name }`, and
`{ type: 'group', tokens }`. `new TokenData(tokens, originalPath?)` is a lightweight
container; consuming operations validate it. Structural token objects, frozen
arrays and readonly TypeScript arrays are accepted.

`pathToRegexp(path, options?)` returns `{ regexp, keys }`. `path` accepts a string,
TokenData or nested arrays of either. Alternatives retain their input order.
The result is caller-owned; later input mutations do not affect it.

`match(path, options?)` builds a reusable function returning `false` or
`{ path, params }`. `path` contains the original matched text and casing. `params`
is a fresh null-prototype object, with strings for named parameters and arrays
for wildcards. Duplicate names retain the last participating capture. Failed
matches do not run decoders. Prefix matches end at a delimiter boundary.

`compile(path, options?)` builds a reusable URL generator. Its input is a string
or TokenData, with arrays reserved for matching alternatives. Parameter values
are strings; encoded wildcard values are nonempty arrays of strings. Missing or
null values omit their enclosing optional group, or cause an error if required.
Optional groups retain upstream's evaluation and error order: callbacks for a
partially present group can run before that group is omitted. Without arguments,
the generator uses an empty parameter object.

`stringify(data)` returns route syntax from TokenData. Groups use braces, named
parameters use `:name`, and wildcards use `*name`. Names may be quoted; text escapes
reserved punctuation. Unicode names and literal control characters round-trip.
Text-token boundaries and empty text tokens are not preserved by reparsing.

`PathError` extends TypeError and retains `originalPath`, including upstream's
error-message help URL. Ordinary schema/option/type errors are TypeErrors;
malformed percent encoding still throws URIError. Exceptions from getters,
proxies and custom callbacks propagate unchanged.

### Options

| Option | Used by | Default | Meaning |
| --- | --- | --- | --- |
| `encodePath` | parse, compile, match, pathToRegexp | identity | Encode literal text in string routes. |
| `delimiter` | compile, match, pathToRegexp | `/` | Nonempty segment delimiter. |
| `encode` | compile | encodeURIComponent | Encode parameter values, or `false` for raw strings. |
| `decode` | match | decodeURIComponent | Decode captures, or `false` for raw strings. |
| `end` | match, pathToRegexp | true | Require a complete match. |
| `trailing` | match, pathToRegexp | true | Allow one optional trailing delimiter. |
| `sensitive` | match, pathToRegexp | false | Use case-sensitive matching when true. |

Each recognized option is read once per operation. Custom codecs must return
strings. Custom wildcard decoders retain upstream's Array.map callback arguments
(value, index, original split array), while parameter decoders receive one value.
With `decode: false`, wildcard captures remain strings. With `encode: false`,
wildcard inputs must also be strings; raw output is not percent-encoded.
No global route cache or generated JavaScript is used.

### Intentional compatibility changes

- Compiled functions and regex keys no longer observe later input-token mutations.
- Generation uses own parameter/array entries; inherited values and sparse
  wildcard elements cannot supply parameters. Values and wildcard lengths are
  read once per occurrence. Repeated parameter names still cause repeated reads.
- Paths and matched inputs must be strings or the documented token structures;
  no implicit coercion. Generator arguments and options must be non-null objects,
  excluding arrays. Unknown options are ignored; known booleans must be booleans,
  delimiters nonempty strings, codecs functions (or supported `false`), and codec
  results strings. Undefined options retain defaults.
- Tokens must have known types and string fields; names cannot be empty, and
  token/path arrays must have own entries. Getter/proxy errors propagate.
- Groups and nested path arrays permit at most **128 levels**. Cycles fail
  explicitly. The original **256 generated alternatives** limit is unchanged.
- Corrected name serialization may contain literal control characters where
  upstream emitted JSON-style escapes. No route-regexp syntax from older major
  versions is added: use Express 5 named wildcards and brace groups.

## Verification

363 tests on Node 24 and Bun cover all 344 original data cases and upstream
error contracts, plus 18 focused tests. The corpus compares matching results,
regex sources/flags/capture order and URL output with the verified 8.4.2 fixture.
Additional checks include all 65,536 UTF-16 code units in names and URL encoding, 4,000 generated
route/input comparisons, mutation isolation, getter counts, custom codecs,
malformed URIs, prototype-shaped names, cycles, nesting, alternative limits,
adversarial paths and CJS/ESM identities. Original TypeScript test sources are
retained as text fixtures; the generated corpus needs no test-runner dependency.

The shared integration gate substitutes this package into the real Express 5
router. The shared gate now runs 217 checks per runtime. Its 20 new HTTP checks cover parameters, wildcards, optional groups,
array routes, percent decoding and malformed escapes, mount boundaries, strict
routing, case sensitivity and prototype-shaped names. Archive checks install
with npm and Bun, exercise CJS/ESM on both runtimes, verify seven-file contents,
and compile TypeScript 7 consumers without platform ambient types.

```sh
node --test packages/vpath-to-regexp/test/*.test.cjs
bun test packages/vpath-to-regexp/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

## Benchmarks

The [harness](bench/compare.cjs) compares verified upstream 8.4.2 with VPM.
It checks equivalent outputs, warms the corpus and each case, alternates execution
order across twelve samples, retains a 256-slot result buffer and consumes results
after timing. Standard cases use 20,000 calls per sample; regex/template building
uses smaller counts recorded per case. Timing includes retention writes and
excludes final consumption. Parsing, matcher construction, request matching,
template construction, URL generation and stringification are separate cases.
These isolated operations do not establish HTTP throughput or tail latency.

```sh
OUTPUT=/tmp/vpath-node.json node packages/vpath-to-regexp/bench/compare.cjs
OUTPUT=/tmp/vpath-bun.json bun packages/vpath-to-regexp/bench/compare.cjs
```

Measurements recorded 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0.
Three fresh processes per runtime use identical source hashes and produce the
same consumed checksum. Raw data: [Node 1](bench/node24.json),
[Node 2](bench/node24-repeat2.json), [Node 3](bench/node24-repeat3.json);
[Bun 1](bench/bun14.json), [Bun 2](bench/bun14-repeat2.json),
[Bun 3](bench/bun14-repeat3.json).

All 50 cases appear below. Values are first-process medians in **nanoseconds per
call**, upstream → VPM. Ratios give VPM/upstream across all three processes;
**lower is better**, and 0.50 means half the time.

| Operation | Node 24, upstream → VPM | Bun, upstream → VPM | Node ratio, three runs | Bun ratio, three runs |
| --- | ---: | ---: | ---: | ---: |
| parse: static | 427.1 → 71.6 | 363.6 → 121.0 | 0.163–0.168 | 0.325–0.371 |
| parse: parameters | 1,173.2 → 207.9 | 831.0 → 306.5 | 0.177–0.208 | 0.369–0.467 |
| parse: optional | 903.6 → 424.9 | 679.9 → 598.6 | 0.470–0.511 | 0.840–0.885 |
| parse: wildcard | 583.5 → 127.6 | 468.8 → 180.4 | 0.211–0.222 | 0.381–0.400 |
| parse: unicode | 563.4 → 186.3 | 584.9 → 209.9 | 0.313–0.337 | 0.321–0.359 |
| parse: escaped | 1,100.4 → 216.5 | 760.9 → 281.2 | 0.192–0.197 | 0.347–0.370 |
| parse: long | 47,170.4 → 161.5 | 26,811.9 → 192.6 | 0.003–0.004 | 0.007–0.007 |
| regexp: static | 1,122.7 → 963.0 | 1,212.1 → 1,474.2 | 0.795–0.858 | 0.800–1.216 |
| regexp: parameters | 2,795.3 → 1,931.5 | 2,079.0 → 1,621.8 | 0.691–0.796 | 0.780–0.811 |
| regexp: optional | 4,792.2 → 4,788.9 | 3,831.6 → 3,816.1 | 0.980–0.999 | 0.996–1.045 |
| regexp: wildcard | 1,824.1 → 1,389.2 | 1,079.3 → 930.2 | 0.762–0.833 | 0.844–0.862 |
| regexp: unicode | 1,725.0 → 1,464.5 | 1,395.9 → 1,184.0 | 0.846–0.856 | 0.793–0.848 |
| regexp: escaped | 1,992.5 → 1,336.3 | 1,609.9 → 1,179.6 | 0.642–0.671 | 0.733–0.785 |
| regexp: long | 62,359.0 → 8,856.2 | 36,941.5 → 6,786.5 | 0.142–0.158 | 0.184–0.189 |
| regexp: 32 alternatives | 21,623.9 → 23,080.0 | 18,530.9 → 19,853.1 | 1.024–1.075 | 1.020–1.071 |
| regexp: path array | 3,797.0 → 3,562.6 | 3,954.2 → 3,931.7 | 0.938–1.028 | 0.994–1.051 |
| match: static hit | 42.3 → 32.1 | 56.6 → 29.3 | 0.759–0.805 | 0.447–0.518 |
| match: static miss | 20.0 → 18.1 | 16.6 → 16.7 | 0.892–0.904 | 0.825–1.003 |
| match: parameter | 195.0 → 83.6 | 135.1 → 94.7 | 0.418–0.429 | 0.547–0.701 |
| match: parameter miss | 20.7 → 21.3 | 17.4 → 17.5 | 1.019–1.029 | 1.006–1.027 |
| match: two parameters | 344.4 → 125.6 | 226.3 → 113.8 | 0.348–0.365 | 0.487–0.503 |
| match: percent decoding | 208.7 → 230.7 | 128.8 → 141.4 | 0.947–1.105 | 1.075–1.098 |
| match: optional | 198.7 → 98.3 | 136.9 → 91.8 | 0.489–0.513 | 0.614–0.671 |
| match: wildcard | 418.0 → 359.2 | 337.4 → 275.9 | 0.815–0.870 | 0.818–0.875 |
| match: prefix | 219.9 → 99.4 | 124.5 → 78.0 | 0.430–0.473 | 0.571–0.627 |
| match: decode false | 72.2 → 74.4 | 62.6 → 70.1 | 1.017–1.577 | 0.929–1.119 |
| match: custom decode | 255.4 → 257.3 | 209.1 → 209.9 | 1.007–1.241 | 1.004–1.124 |
| match: path array | 174.6 → 84.4 | 136.5 → 81.0 | 0.483–0.492 | 0.538–0.633 |
| match: Unicode | 149.2 → 85.8 | 119.5 → 71.2 | 0.575–0.590 | 0.554–0.634 |
| match: long failure | 3,716.9 → 3,686.1 | 1,255.3 → 1,254.5 | 0.992–1.011 | 0.999–1.010 |
| matcher build: static hit | 1,094.5 → 1,158.2 | 1,027.5 → 969.3 | 0.837–1.058 | 0.943–0.978 |
| matcher build: parameter | 1,557.4 → 1,400.0 | 1,407.4 → 1,447.5 | 0.853–0.915 | 0.948–1.028 |
| matcher build: optional | 4,736.4 → 4,606.0 | 4,465.9 → 4,849.0 | 0.972–1.038 | 1.075–1.105 |
| matcher build: wildcard | 1,331.0 → 1,017.2 | 1,283.2 → 1,086.7 | 0.751–0.764 | 0.847–0.901 |
| template build: static | 447.5 → 121.2 | 569.4 → 252.8 | 0.267–0.281 | 0.444–0.555 |
| generate: static | 18.9 → 8.6 | 27.3 → 13.0 | 0.448–0.457 | 0.474–0.477 |
| template build: parameter | 547.9 → 140.9 | 578.5 → 263.1 | 0.256–0.263 | 0.455–0.489 |
| generate: parameter | 163.3 → 152.8 | 125.0 → 118.0 | 0.910–0.935 | 0.939–0.945 |
| template build: two parameters | 1,150.0 → 214.5 | 1,115.8 → 392.0 | 0.184–0.199 | 0.332–0.391 |
| generate: two parameters | 181.8 → 126.3 | 190.0 → 110.6 | 0.680–0.695 | 0.582–0.618 |
| template build: optional | 973.2 → 431.5 | 1,262.8 → 655.6 | 0.443–0.450 | 0.495–0.582 |
| generate: optional | 209.5 → 152.3 | 140.4 → 116.3 | 0.719–0.727 | 0.801–0.828 |
| template build: wildcard | 605.2 → 146.2 | 659.9 → 215.6 | 0.216–0.242 | 0.327–0.434 |
| generate: wildcard | 277.9 → 304.8 | 209.8 → 238.9 | 1.089–1.140 | 1.138–1.315 |
| template build: encode false | 636.0 → 141.6 | 596.7 → 261.9 | 0.223–0.231 | 0.402–0.439 |
| generate: encode false | 47.9 → 51.1 | 53.4 → 49.6 | 1.002–1.067 | 0.928–1.322 |
| stringify: parameters | 321.3 → 356.6 | 131.0 → 210.2 | 1.105–1.112 | 1.505–1.605 |
| stringify: optional | 459.9 → 541.4 | 187.7 → 331.5 | 1.155–1.177 | 1.714–1.767 |
| stringify: escaped | 236.9 → 254.8 | 203.7 → 218.9 | 1.039–1.076 | 1.075–1.125 |
| stringify: long | 178.6 → 199.9 | 109.9 → 140.6 | 1.116–1.119 | 1.280–1.366 |

### Gains and tradeoffs

Ordinary one-/two-parameter matching takes **57–65% less time on Node and
30–51% less on Bun**. Default wildcard matching takes **13–19% less on Node and
12–18% less on Bun**. Short route parsing takes **49–84% less on Node and
11–68% less on Bun** across six shapes. The 804-character literal-heavy route
has a much larger gain from avoiding character-array allocation and repeated
concatenation; that result should not be extrapolated to short routes.

URL-template construction takes **55–82% less time on Node and 42–67% less on
Bun** across the six measured templates. Generating a two-parameter URL takes
**30–32% / 38–42% less time**, and optional URL generation takes **27–28% /
17–20% less**, respectively.

Several paths are slower. Default percent-decoded matches range from 5% faster
to 11% slower on Node (up to 22 ns extra), and take 8–10% more time on Bun
(up to 13 ns extra). Wildcard URL generation takes **9–14% more on Node and
14–32% more on Bun**, up to 42 / 63 ns extra, while enforcing own array entries,
single reads and codec-result validation. Stringification takes **4–18% more on
Node and 8–77% more on Bun** across these cases, up to 81 / 144 ns extra; it now
validates token schemas, nesting and cycles and preserves the corrected name
round trips. These are explicit costs, not speedup claims.

Route construction is mixed: 32-alternative regex construction takes 2–8% more
on Node and 2–7% more on Bun (up to 1.6 / 1.3 microseconds extra), including the
pre-expansion count. Bun's optional matcher construction takes 7–11% more time.
Small custom/raw-decoding paths vary: Node's raw wildcard matching reaches 58%
more time (69 ns extra) in one process; custom wildcard decoding reaches 24%
more (73 ns). Bun's corresponding maxima are 12% (8 ns) and 13% (28 ns).
Misses and the long failing-path case are mostly near ties. The full table retains
all cases; none of these measurements establishes application HTTP throughput.

## Distribution and provenance

Node.js 20+ package baseline; local testing and benchmarks target Node 24 and Bun.
Use the workspace or pack with `bun pm pack --ignore-scripts` and install the
resulting archive. Not yet published to npm. Tests, upstream fixtures and benchmark
results are excluded from the seven-file archive.

Derived from [path-to-regexp 8.4.2](https://github.com/pillarjs/path-to-regexp/tree/cbf30259e6d34d6135f9e7dbaa3371e7188f9936)
under MIT. [LICENSE](LICENSE) retains upstream attribution;
[PROVENANCE.json](PROVENANCE.json) records archive integrity, source revision and
test hashes. [Declarations](index.d.ts) cover every public export.
