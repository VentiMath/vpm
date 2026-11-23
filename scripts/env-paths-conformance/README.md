# Application-directory checks

Controls pin env-paths 4.0.0, the app's 2.2.1 and Capacitor 8.2.0. Their registry
integrities are recorded in package-lock.json. Shipping code has no dependencies.

- `upstream.cjs` verifies the commit/hash-pinned, unmodified upstream test source
  and runs its five macOS and six Linux cases through a minimal AVA assertion
  adapter. Bun only converts module syntax; the assertions are unchanged. The
  upstream default assertion is not Windows-aware (it expects the app name at
  the end of every path), so Windows uses the independent checks below.
- `contract.cjs` compares 13,152 current results/rejections and 1,920 legacy
  results over macOS, Windows, Linux and FreeBSD path implementations, twelve
  environment configurations, names and suffix values. No native Windows run is
  claimed. The 4.0.0 control is compiled into ignored node_modules for VM loading.
- `callers.cjs` checks the hashed, unchanged Capacitor ENV_PATHS initializer,
  system-config read/write and IPC log-opening code. Files live only in a fresh
  temporary directory. UUID, logging, subprocess fork and network are explicit
  local stubs; no telemetry is sent. `VPM_ENV_PATHS_PACKAGE` selects an installed
  archive for the same caller check. Filesystem calls use built `vfs-extra`.
- `archives.cjs` checks fresh/frozen npm and Bun installs under the original
  `env-paths` name, zero runtime dependencies, CJS/ESM, unchanged callers and
  TypeScript 7 NodeNext/Bundler consumers without ambient platform types.

```sh
npm --prefix scripts/env-paths-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/venv-paths/test/*.test.cjs
node scripts/env-paths-conformance/upstream.cjs
node scripts/env-paths-conformance/contract.cjs
node scripts/env-paths-conformance/callers.cjs
node scripts/env-paths-conformance/archives.cjs
```

The first three runtime checks also run on Bun. Public release and app adoption
remain separate from this source verification.
