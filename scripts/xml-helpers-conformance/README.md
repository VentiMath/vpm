# XML helper conformance

Private, separately locked controls for `vxml-naming` and `vis-unsafe`. These
upstream packages are test dependencies, excluded from runtime package archives.
Baselines checked October 30, 2026: xml-naming 0.3.0, is-unsafe 2.0.2,
fast-xml-parser 5.11.2 and fast-xml-builder 1.3.1. Storage 8.4.0 comes from the
adjacent retry-request fixture.

```sh
npm --prefix scripts/xml-helpers-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/xml-helpers-conformance/run.cjs --upstream
node scripts/xml-helpers-conformance/run.cjs
node scripts/xml-helpers-conformance/regressions.cjs
node scripts/xml-helpers-conformance/callers.cjs --upstream
node scripts/xml-helpers-conformance/callers.cjs
```

Repeat the scripts with `bun`. The root suites include retained tests and focused
package regressions; the root integration gate includes the caller fixture.

## Retained source and tests

`upstream/` preserves MIT source, declarations, licenses and tests at commits
`0330d0cfa57ee483a834c474b2d0a4f0449ee81d` (xml-naming) and
`fcc5f3010c1c8e04dbe8baa1f47fee4f2078625f` (is-unsafe). Files carry `.txt`
extensions and normalized trailing EOF whitespace. `SHA256.json` checks every
snapshot. The runner compares installed source to retained source, removes
imports in memory and supplies a small assert-backed Jasmine adapter.

All 78 naming and 294 unsafe-string tests execute; none are skipped. The VPM run
corrects eight naming assertions at retained lines 72, 81, 82, 90, 91, 292, 297 and
497, across six tests. They incorrectly exclude U+0487 and supplementary name
characters under the current XML editions. Each replacement is guarded against
source drift. The upstream control runs the original assertions unchanged.

`regressions.cjs` contains 14 paired upstream/VPM discriminators and 20,000
seeded comparisons of combined HTML/XML scanners against individual upstream
patterns. The package tests independently check all Unicode code points at a
name start and continuation and 20,000 repair/validation combinations.

## Actual callers

The published CommonJS XML bundles embed helpers, so aliasing their outer
package names would not exercise replacements. `callers.cjs` copies current
parser and builder source into a disposable directory and changes only helper
imports and the parser's builder re-export. Version assertions and exact import
counts guard these edits. VPM adapters read current CommonJS exports so the root
integration gate's counting proxies observe actual calls.

Six parser cases compare results and errors to upstream. A supplementary entity
case records the intentional XML 1.0 correction. Five builder cases cover
ordinary and ordered objects, invalid-name repair and supplementary names. Then
Storage's real `TransferManager.uploadFileInChunks` performs two mocked multipart
uploads, using string and Buffer responses, with all six HTTP requests checked.
Network transport is mocked; the SDK's parser, builder and multipart code run.

The VPM run records six direct QName calls, seven validator constructions and
four entity predicates. The upstream run records three predicates because it
rejects the supplementary entity before checking its value. Storage itself
accounts for two validator constructions and no name/entity checks on ordinary
responses. This fixture does not claim that helpers affect every XML document.

Known caller limits are asserted: the parser's independent `XMLValidator` still
rejects supplementary names, and the builder's default `sanitizeName: false`
bypasses name checks. No application dependencies are automatically migrated.
