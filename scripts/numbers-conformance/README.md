# Numeric normalization and parsing controls

Pinned comparison packages: anynum 1.0.1, strnum 2.5.1 and @byspec/numbers 0.1.1.
They are private test/benchmark dependencies, excluded from VPM runtime archives.

```sh
npm --prefix scripts/numbers-conformance ci --ignore-scripts
node scripts/numbers-conformance/generate-data.cjs --check
node scripts/numbers-conformance/run.cjs
node scripts/numbers-conformance/run.cjs --upstream
node scripts/numbers-conformance/regressions.cjs
node scripts/numbers-conformance/callers.cjs
node scripts/numbers-conformance/callers.cjs --upstream
```

Repeat runtime commands with `bun`. The caller fixture also requires
`npm --prefix scripts/retry-request-conformance ci --ignore-scripts`.

## Retained upstream coverage

[upstream/SHA256.json](upstream/SHA256.json) pins source, licenses and test snapshots.
Only terminal blank lines are normalized in those snapshots. The runner removes
import declarations, injects the selected library and the original numeric
scenario package, and supplies the Jasmine assertion methods used by the tests
through `node:assert/strict`. It runs all 32 anynum and 47 strnum cases without
changing their assertions, including the IEEE/ECMAScript scenario checks.

Source commits: anynum `72a498f0f40000bb53434f9e3fe9535803a99b7e`, strnum
`5aa0a504335d30d761c0b79865b40eb80da5a2ab`. Both match the pinned registry source.
`regressions.cjs` reproduces the 160 missing decimal digits, overflow policy
bypasses, radix overflow, single-zero rejection, stateful regex matching and
option-prototype injection, asserting both original and corrected behavior.

## Unicode data

The official [Unicode 18.0.0 DerivedNumericType data](https://www.unicode.org/Public/18.0.0/ucd/extracted/DerivedNumericType.txt)
and [Unicode license](upstream/unicode/LICENSE.txt) are retained with hashes.
`generate-data.cjs` extracts every `Decimal` range into compact runtime lookup
pages. `--check` verifies the checked-in generated file. No host Unicode-property
regular expression determines coverage. Focused tests check all 770 digits and
every other code point, including isolated surrogate code units.

## Actual callers and limits

The caller fixture loads fast-xml-parser 5.11.2 from the locked Storage fixture.
Its distributed CJS file bundles strnum, so replacing a module-cache entry cannot
reach that embedded implementation. Instead, the fixture copies that release's
unbundled `src` into a temporary directory and changes exactly its `strnum` import
to a counting adapter. All other parser source and dependencies remain upstream.
It compares against the original ESM parser on the same runtime.

Twelve differential XML cases cover defaults, attributes, booleans, text, CDATA,
precision, radix options, exponents and opt-in Unicode. Two further cases assert
intentional differences. Storage 8.4.0 then receives that parser through its CJS
entry and performs two multipart uploads against a local request stub, with string
and Buffer initiation responses. Six requests cover initiation, checksummed part
upload and completion; 70 numeric-parser calls are counted across the fixture.
This verifies caller integration without real credentials or network services.

Storage uses Unicode normalization disabled by default. Numeric-looking upload
IDs still follow the SDK's default XML coercion policy; preserving arbitrary IDs
requires a caller option change and is not claimed as fixed by these helpers.

Public declaration and packed-archive gates separately verify CommonJS, ESM and
TypeScript consumers. Benchmarks live under each package and retain three fresh
processes plus an identical-upstream control on each runtime.
