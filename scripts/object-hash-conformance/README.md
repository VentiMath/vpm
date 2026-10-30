# Object-hash comparison fixtures

The pinned baseline is **object-hash 3.0.0**, at
[1045a05](https://github.com/puleos/object-hash/tree/1045a05d42c2077f7b380617d0f3d32c851234dd).
`package-lock.json` also pins google-gax 6.14.0 and Mocha 11.7.5.
`upstream/SHA256.json` verifies retained source/tests; the installed baseline must
match the retained `index.js` byte for byte.

```sh
npm --prefix scripts/object-hash-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/object-hash-conformance/run.cjs
node scripts/object-hash-conformance/run.cjs --upstream
node scripts/object-hash-conformance/regressions.cjs
node scripts/object-hash-conformance/callers.cjs
node scripts/object-hash-conformance/callers.cjs --upstream
```

Repeat with `bun` in place of `node`. CI runs both runtimes and original
controls; VPM callers also run through the root integration suite.

## Upstream tests

All **68 cases** execute on each runtime and implementation, with no skipped
cases. Temporary copies receive explicit fixture repairs:

- The Blob/File file lacked a local `validSha1` declaration. Its final test
  claimed to compare unchanged metadata but used two different filenames; the
  repaired fixture uses the same filename for both files.
- File and timer fixtures receive explicit standard type tags. Bun otherwise
  exposes File as Blob and timer handles as Timeout. The same normalization runs
  for both implementations; focused tests separately exercise native Bun files.
- Stream assertions drain all available chunks, because Bun's first `read()`
  can contain only the first write. Their content assertions are unchanged.
- VPM removes DataView from one list of opaque fake native tags. Real DataView
  contents and offsets are checked by a paired regression probe instead of
  expecting the constant `dataview` token.

The old-crypto tests still run, but supported runtime targets remain Node 24 and
Bun. The repairs alter fixture plumbing or erroneous expectations; they do not
edit installed upstream packages.

## Corrections and callers

`regressions.cjs` demonstrates nine desired behaviors that fail against upstream
and pass against VPM: DataView bytes, adjacent Buffer framing, unordered binary
bytes, sparse holes, map pair ordering, file timestamps, exact passthrough byte
output, own options and boolean option validation. The package adds eighteen
focused root tests, including seeded differential values across twelve option
configurations and crypto/serialization equivalence.

`gax.cjs` evaluates the actual installed `grpc.js` and `fallback.js` CommonJS
sources with an injected `object-hash` import. This works on Node and Bun without
patching installed files or copying the cache implementation. Each caller run
counts twelve hash invocations, requires string inputs, verifies the original
cache keys, hits/misses, forced reloads, explicit clearing and source immutability.
It also encodes/decodes a real protobuf message through each loaded definition.
No network, cloud credentials or live SDK requests are involved. This verifies
the hashing/cache boundary, not google-gax's full transport API.
