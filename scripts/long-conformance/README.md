# Long comparison fixtures

The baseline is **long 5.3.2**, checked October 30, 2026, at
[e1bcb4f](https://github.com/dcodeIO/long.js/tree/e1bcb4f65096465b69f0fd67e68fc2a79a67ade9).
`package-lock.json` pins protobuf.js 8.8.1, gRPC proto-loader 0.8.1 and
google-gax 6.14.0; the Google callers resolve protobuf.js 7.6.6.

```sh
npm --prefix scripts/long-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/long-conformance/run.cjs
node scripts/long-conformance/run.cjs --upstream
node scripts/long-conformance/regressions.cjs
node scripts/long-conformance/callers.cjs
node scripts/long-conformance/callers.cjs --upstream
```

Repeat with `bun` in place of `node`. CI runs both runtimes and original
controls; VPM callers also run in the root integration suite.

## Upstream tests

All **175 upstream/Closure cases**, plus the CommonJS entry checks, run unchanged
with no skips or expectation edits. A temporary ESM entry and CommonJS `umd`
entry redirect imports to the selected implementation. The test files match
their Git blobs at the pinned commit; `upstream/SHA256.json` verifies the retained
source, declarations, license and tests. The installed upstream source must also
match the retained source byte for byte.

## Corrections and callers

Seven paired probes demonstrate upstream failures corrected by VPM: malformed
decimal suffixes and interior chunks, fractional radices, short byte arrays,
out-of-range bytes, shared small-integer mutation and writable constants. Each
probe loads an isolated implementation so mutation cannot affect other checks.

`consumers.cjs` loads actual installed protobuf.js and proto-loader CommonJS
sources with only `long` substituted. Per-instance caches isolate variants;
installed files and global require-cache entries are unchanged. Google gRPC and
fallback `loadProtoJSON` methods use those real modules. Counters prove calls
reach the injected constructor and conversions.

Sixteen paths compare exact int64 wire bytes and decoded values for all five
protobuf integer encodings, defaults, arrays, timestamps and int64 map keys.
Protobuf 7 returns map keys as eight-byte hashes; protobuf 8 returns decimal
strings. Each version's existing behavior is preserved. Both proto-loader
Long/string options and Google gRPC/fallback definitions are checked. Source
hashes are unchanged afterwards. No cloud requests or credentials are involved;
this verifies the integer boundary, not the full protobuf or transport API.
