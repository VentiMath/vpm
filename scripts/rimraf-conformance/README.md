# Rimraf conformance

The runtime in [vrimraf](../../packages/vrimraf) is independently written.
Pinned npm packages are test controls only: rimraf 6.1.4, VentiMath's installed
6.1.3, SDK dependency 5.0.10 and Capacitor CLI 8.2.0.

- `contract.cjs`: 242 filesystem/result comparisons covering synchronous and
  asynchronous removal, missing paths, literal metacharacters, arrays, symlinks,
  globs, filters and retention masks. The overlap control explicitly selects
  upstream's manual path: Bun's native concurrent parent/child `rm` race is a
  separate regression tested directly in vrimraf, not accepted as an oracle.
- `callers.cjs`: executes the unchanged published Capacitor iOS build module,
  with Xcode, signing/export commands and logging stubbed. All files are synthetic
  in dedicated temporary directories. Twelve combinations cover current/app/VPM
  libraries, project/workspace selection and spaced scheme names. It proves
  cleanup compatibility, not a complete iOS build or deploy.
- `archives.cjs`: packs the eight-package VPM closure, installs and reinstalls
  with npm and Bun using fresh caches, loads the original `rimraf` package name
  from CJS and ESM on both runtimes, exercises the real cleanup caller and CLI,
  and compiles NodeNext and bundler TypeScript consumers.
- Package tests cover batch preflight, lazy glob loading, overlap deduplication,
  symlink replacement in filters, abort reasons, retries, sync promise rejection
  and CLI arguments. Root rejection tests stub removal functions as an additional
  guard; no upstream command is given a real filesystem root.

```sh
npm --prefix scripts/rimraf-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vrimraf/test/*.test.cjs
node scripts/rimraf-conformance/contract.cjs
node scripts/rimraf-conformance/callers.cjs
node scripts/rimraf-conformance/archives.cjs
bun test packages/vrimraf/test
bun scripts/rimraf-conformance/contract.cjs
bun scripts/rimraf-conformance/callers.cjs
```

No full upstream-suite or Windows-conformance claim is made. Google SDK lockfile
entries are recorded as dependency occurrences, not verified deployment callers.
