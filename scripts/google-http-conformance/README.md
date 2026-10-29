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

The UUID and node-fetch source archives are reserved for the next compatibility
steps. Downloading an archive alone does not establish test coverage.
