# Filesystem convenience compatibility

Controls are fs-extra **11.4.1**, VentiMath's **11.3.4**, Ionic's **9.1.0**, and
Capacitor CLI **8.2.0**. Fixture dependencies are comparison tools, not runtime
requirements of vfs-extra.

- **266 upstream tests in 33 selected files**, unchanged, on Node and Bun. Source
  comes from `1e223d3b1e26b7ebef7f402acf0e3b5533cc5833`; `upstream.json` verifies
  its hashes and the retained MIT license. The harness relocates scratch paths
  and redirects package imports to VPM. The upstream timestamp fixture helper
  uses native `utimesSync`. No assertions are rewritten. Private implementation
  mocks, special-device cases and the full upstream test runner are not claimed.
  Two overlapping-copy groups require ancestor merges and upstream's recursive
  error-path wording; they are explicitly excluded in the manifest. Focused VPM
  regressions instead verify rejection and preservation of source bytes.
- **19 focused regression tests** exercise both execution modes, callbacks,
  numeric descriptors and multi-result I/O, metadata, filter mutation, symlink
  targets, hard-link aliases, root protection, cyclic dereferencing, and injected
  cross-device/copy failures.
- **432 differential comparisons per runtime** compare filesystem state and
  success/rejection across current, app and Ionic controls. They cover file and
  directory copy, filters, overwrite flags, moves, output, ensure and cleanup.
  These comparisons do not assert identical validation messages or incidental
  helper return values.
- **32 unchanged Capacitor workflows per runtime** run Android/iOS asset-copy,
  config creation, Swift template setup and obsolete CocoaPods cleanup. Actual
  fs-extra calls are instrumented. Plugin discovery, build hooks, logging and
  archive extraction are stubbed; extraction writes known fixture files before
  the real move calls run. No Xcode, signing, real user config, application files
  or external services are used. Caller source hashes are printed with results.
- **Fresh and frozen npm/Bun archive installs** exercise the original `fs-extra`
  name, the two-package VPM closure, CJS/ESM and convenience-only exports, unchanged
  callers, and TS7 NodeNext/Bundler consumers.

```sh
npm --prefix scripts/fs-extra-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vfs-extra/test/*.test.cjs
node scripts/fs-extra-conformance/upstream.cjs
node scripts/fs-extra-conformance/contract.cjs
node scripts/fs-extra-conformance/callers.cjs
node scripts/fs-extra-conformance/archives.cjs
bun test packages/vfs-extra/test
bun scripts/fs-extra-conformance/upstream.cjs
bun scripts/fs-extra-conformance/contract.cjs
bun scripts/fs-extra-conformance/callers.cjs
```

[Runtime scope](../../packages/vfs-extra/README.md) and
[measurements](../../packages/vfs-extra/bench/README.md) distinguish tested behavior
from release/adoption and whole-build performance.
