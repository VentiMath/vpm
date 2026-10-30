# HTML entity conformance

This isolated fixture pins **html-entities 2.6.0**, checked against npm's stable
release on October 30, 2026. Original packages stay outside VPM runtime dependencies
and installable archives. Source commit:
`58d1635d40d858efd5b6540f7b62c3a382a35bf1` (`v2.6.0`). Retained source, data,
tests, metadata and license have a SHA-256 manifest; per-line trailing whitespace
is normalized. npm installation is integrity-pinned in the lockfile.

```sh
npm --prefix scripts/entities-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/entities-conformance/run.cjs
node scripts/entities-conformance/run.cjs --upstream
node scripts/entities-conformance/regressions.cjs
node scripts/entities-conformance/callers.cjs
node scripts/entities-conformance/callers.cjs --upstream
node --disable-warning=ExperimentalWarning scripts/entities-conformance/generate-data.cjs --check
```

Repeat runtime checks with `bun`. Node 24 prepares the fixture's JavaScript by
erasing upstream test-only TypeScript annotations; both engines execute the same
result. The workspace's compiler and public declaration checks remain TypeScript 7.

## Retained upstream cases

`run.cjs` executes **30 runtime/metadata cases**, including upstream's exhaustive
HTML5 named-reference loop, against VPM and original controls. Jest's describe,
setup and equality calls use a minimal native assertion adapter; package metadata
reads select the implementation under test. Imports select the package entry point.
No runtime expectation is changed or skipped.

The upstream build-selection harness and its external `tsx` example invocation
are replaced by repository gates: actual npm/Bun archives, CommonJS and ES imports,
TypeScript 7 consumers and downstream declaration compatibility. The original
`tsx` example executed code; it did not type-check declarations. These build-harness
branches are not counted as runtime cases.

The root suite adds **21 focused tests**. It compares every named/character table
with the pinned original, checks all mode/level/numeric combinations, runs 3,000
seeded mixed-input comparisons and 4,096 generated Unicode references, and covers
long numeric, sparse, dense and unknown input. Malformed single references,
prototype-like names, zero encoding, option validation and reentrant getters have
direct assertions.

`regressions.cjs` confirms that original controls reproduce the U+10FFFF boundary,
lone-surrogate, malformed-number, inherited-lookup, attribute-equals and numeric-zero
problems. Corrected expectations are supported by the
[HTML parsing standard](https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state)
where applicable; configuration validation is an intentional API decision.

## Generated data and caller evidence

`generate-data.cjs` preserves the upstream compressed name lists, canonical
encoding choices and body-match expressions. It erases types, converts exports
to CommonJS, and creates frozen prototype-free named maps. `--check` verifies
that committed generated data still matches the retained source and transformation.

`callers.cjs` loads Storage **8.4.0**'s actual `ApiError` implementation and replaces
only its html-entities dependency in process-local module state, restoring caches
afterward. Sixteen calls cover HTML text, Buffers, numeric and multicodepoint
references, message deduplication, combined errors and corrected scalar behavior.
Additional assertions check that structured JSON errors and direct messages bypass
decoding. Controls use Storage's installed html-entities 2.6.0 with explicit old
expectations for the two corrected scalar cases. The root integration gate passes
its instrumented replacement here. No cloud credentials or network are required.

[Benchmarks](../../packages/vhtml-entities/bench/results/README.md) retain paired
samples, three fresh processes and an identical-upstream control per runtime.
