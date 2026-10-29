# Google HTTP dependency compatibility

These are development-only test tools and immutable upstream source archives.
They are excluded from VPM package archives and application runtime dependencies.
Versions, source commits and archive hashes are recorded in each package's
`PROVENANCE.json` and verified by the runners.

```sh
npm --prefix scripts/google-http-conformance ci --ignore-scripts
node scripts/google-http-conformance/helpers.cjs
bun scripts/google-http-conformance/helpers.cjs
node scripts/google-http-conformance/helpers.cjs --upstream
```

The helper runner executes extend 3.0.2's original Tape 4 assertions: 90 pass,
with the single test that removes the native `Array.isArray` intrinsic skipped
on both implementations. No assertions are changed. Tape 4 is deliberately
pinned because newer equality semantics reject some of these legacy assertions
even against upstream. Focused VPM tests use modern strict assertions.

All 47 assertions in is-stream 2.0.1's five test groups run through a small
strict-assert adapter. Only imports, test framework plumbing and temporary-file
creation change; assertion contents are unchanged. Node and Bun pass both suites.

`node scripts/google-http-conformance/uuid.cjs` (or `bun`) runs 45 UUID 9.0.1
upstream tests, including 1,000 deterministic parse round trips. The runner
changes imports and test registration, skips the four private/browser hash
helper tests, and preserves all remaining assertions. It also supports
`--upstream`. The native algorithms are checked through public v3/v5 vectors.

The node-fetch archive is reserved for the next compatibility step; the published
release tag points to this archive despite its stale internal package version.
Downloading it alone does not establish test coverage.
