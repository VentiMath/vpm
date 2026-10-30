# MIME comparison fixtures

Pinned **mime 4.1.2** at `f2e2240c96e64ea60dcbfb9cff54aeda24126b2b`, and
**mime 3.0.0** as the Storage migration control. Production vmime has no
runtime dependencies; neither fixture ships in its archive.

```sh
npm --prefix scripts/mime-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/mime-conformance/run.cjs --upstream
node scripts/mime-conformance/run.cjs
node scripts/mime-conformance/regressions.cjs
node scripts/mime-conformance/callers.cjs --upstream
node scripts/mime-conformance/callers.cjs --legacy
node scripts/mime-conformance/callers.cjs
node scripts/mime-conformance/bundles.cjs
```

The same commands run under Bun. `upstream/` retains the original main test,
helper, library/CLI source, table-generation script, published standard/other
tables, package metadata and MIT license. EOF whitespace alone is normalized
on GitHub snapshots; published tables are byte-for-byte. `SHA256.json` checks
retained files, and the runner compares installed library/CLI/table source.

The assertion-backed runner collects and executes all 15 upstream cases,
including both CLI cases. Imports and executable paths are redirected;
test bodies and expected results are unchanged. The child-process adapter
returns the same stdout/stderr object as upstream's promisified exec.
The upstream DB consistency loop iterates a Map with `for…in` and performs no
checks; our exhaustive table equality, per-entry lookup/reverse checks and
5,000 seeded paths supply actual data/path coverage. The separate upstream
vendor test only prints known MDN/mime-types differences and is not retained as
an assertion suite. Export checks cover both root/lite and both table subpaths
in the packed archive gate.

Six discriminators compare atomic conflicts, malformed definitions, frozen
prototype-call protection, detached inspection Maps, frozen table arrays and
empty Content-Type misses. `migration.json` records every extension change
between mime 3.0.0 and 4.1.2; tests reject missing or altered rows.

`callers.cjs` injects only MIME lookup into the actual Storage 8.4.0 dependency
slot. Each control and VPM run executes eight uploads and eight composes with
14 lookups, validates payload/gzip bytes and request metadata, and checks that
explicit content types bypass inference. SDK transport is mocked; no cloud
requests, credentials or application deployment are involved. The rest of the
SDK remains upstream in isolated caller runs; the root integration additionally
instruments VPM replacements. The existing retry-request fixture supplies Storage.

`bundles.cjs` executes a minified browser-target bundle in an isolated VM without
Node globals. This checks bundling and selected API calls, not every browser.

See the [package README](../../packages/vmime/README.md) and
[benchmark evidence](../../packages/vmime/bench/results/README.md).
