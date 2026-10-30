# Camel-case comparison fixture

Pins **lodash.camelcase 4.3.0** and **@grpc/proto-loader 0.8.1**, verified as current
npm releases on October 30, 2026. The existing protobuf fixture supplies pinned
google-gax 6.14.0 and Firestore 9.4.0 callers. All tools stay outside installable
VPM packages.

`run.cjs` checks the upstream module's SHA-256 against package provenance, then
runs **347,735 exact differential comparisons**: all short strings of length
zero through five over a ten-character ASCII transition alphabet, all 65,536 BMP
code units in three contexts, 30,000 seeded Unicode sequences, 10,000 astral
samples and ordinary coercions. It separately reproduces three upstream failures
or side effects that VPM corrects: zero BigInts, duplicate zero coercion and fake
Symbol brands.

The standalone npm package ships no test suite. The retained canonical
`lodash.camelCase` section from Lodash commit
`f299b52f39486275a9e6483b60a410e06520c538` has **two tests and twelve assertions**.
It is copied unchanged, with its original license and source/section hashes in
`upstream/`. A small QUnit adapter supplies assertion counting and array iteration.
These selected tests run against both implementations; they are not represented
as the full monolithic Lodash suite.

`callers.cjs` evaluates installed gRPC loader sources with only the camel-case
import replaced and counted. It compares 13 method aliases and wire round-trips,
13 actual gax/grpc-js client aliases, and the 17 methods in Firestore's shipped
v1 schema. Exactly 43 calls must occur. `--stack` also supplies `vprotobufjs`;
`--upstream` retains the stock converter. Consumer source hashes must not change.
No network or credentials are used.

`bundles.cjs` builds equivalent minified browser IIFEs, runs both without Node
globals and with string code generation disabled, and checks ASCII/Unicode
outputs. VPM additionally runs without legacy `global` or `self` discovery.
It reports bundle and gzip sizes; it does not require exact cross-runtime gzip
bytes.

```sh
npm --prefix scripts/camelcase-conformance ci --ignore-scripts
npm --prefix scripts/protobuf-conformance ci --ignore-scripts
node scripts/camelcase-conformance/run.cjs
node scripts/camelcase-conformance/callers.cjs
node scripts/camelcase-conformance/callers.cjs --upstream
node scripts/camelcase-conformance/callers.cjs --stack
node scripts/camelcase-conformance/bundles.cjs
```

Repeat with `bun`. Both runtimes run these checks in CI; the existing backend
integration gate also supplies its instrumented VPM converter to the real callers.
