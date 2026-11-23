# JSON file compatibility

The runtime is independently written. The fixture pins jsonfile 6.2.1, fs-extra
11.3.4 and 9.1.0, and Capacitor CLI 8.2.0. These packages and Mocha are comparison
or caller dependencies only; `vjsonfile` ships with no package dependencies.

- `upstream.cjs`: all 50 unchanged upstream tests at commit
  `97478af83f115359c331119330b418dfb7c5a6e7`, on Node and Bun. The test files and
  MIT license are preserved in `upstream/`; `upstream.json` verifies their bytes.
  Only the harness redirects temporary paths and substitutes native recursive
  removal for the old test-fixture rimraf helper. No assertions are changed.
- `contract.cjs`: 438 differential formatting, BOM, read, reviver and failure
  cases. Literal `$&` line endings are asserted as an intentional difference.
- `callers.cjs`: 36 checks across upstream/VPM and fs-extra 11.3.4/9.1.0, including
  `outputJSON` helpers, callback/Promise/sync operations, and Capacitor's unchanged
  `readConfig`, `writeConfig`, and `writePluginJSON`. The loader redirects only
  jsonfile imports within the fs-extra module graph. Capacitor's config path,
  UUID and logging are isolated; unrelated plugin operations throw if invoked.
  All files live in disposable directories. No real Capacitor config, Xcode,
  application source, credentials or network services are touched.
- `archives.cjs`: fresh and frozen npm/Bun installs of the packed package under
  the original `jsonfile` name, Node/Bun CJS/ESM root and helper imports, unchanged
  callers, and TS7 NodeNext/Bundler consumers. The archive has no dependencies.

```sh
npm --prefix scripts/jsonfile-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vjsonfile/test/*.test.cjs
node scripts/jsonfile-conformance/upstream.cjs
node scripts/jsonfile-conformance/contract.cjs
node scripts/jsonfile-conformance/callers.cjs
node scripts/jsonfile-conformance/archives.cjs
bun test packages/vjsonfile/test
bun scripts/jsonfile-conformance/upstream.cjs
bun scripts/jsonfile-conformance/contract.cjs
bun scripts/jsonfile-conformance/callers.cjs
```

The [package scope](../../packages/vjsonfile/README.md) documents native filesystem
behavior and intentional differences. [Benchmark records](../../packages/vjsonfile/bench/README.md)
include isolated process controls; passing these checks is not evidence of a
faster full build or of application adoption.
