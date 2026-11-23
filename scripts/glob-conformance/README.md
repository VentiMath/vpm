# Glob conformance

Controls are pinned to glob 14.0.6 (current target), glob 13.0.6 (frontend
rimraf), glob 10.5.0 (backend rimraf), rimraf 6.1.3 and rimraf 5.0.10.
Runtime replacement code lives in `packages/vglob`; upstream packages here are
comparison fixtures only.

Verification:

- Eleven independent tests exercise cache reuse, file URLs, stat metadata,
  cancellation during pending I/O, slow consumers, stream destruction,
  cyclic symbolic links, subtree pruning, bounded ignore expansion, literal
  POSIX backslashes and virtual Windows drive paths.
- `contract.cjs`: 5,538 differential checks across the three glob versions,
  including sync/async calls, streams, iterators, file types, ignore, case,
  normalized Unicode, roots, symlinks and depth options.
- `upstream.cjs`: 12 unchanged upstream test files, 135 assertions on Node.
  TypeScript syntax is stripped and imports point at VPM; assertions and
  expected values are unchanged. The standard upstream filesystem fixture is
  created in a private temporary directory. Bun cannot run this TAP harness's
  unimplemented `node:v8` Serializer; Bun runs the independent and differential
  checks instead.
- `callers.cjs`: 20 unchanged rimraf runtime checks. Instrumented dependency
  resolution proves every glob call reaches VPM; deleted files and retained
  files match the controls. Nothing outside scratch fixtures is deleted.
- `archives.cjs`: fresh and frozen npm/Bun installs of the seven-package VPM
  closure, CJS/ESM/raw exports, Node/Bun caller execution and TypeScript 7
  consumers in NodeNext and bundler modes. Local file overrides are explicit;
  these tests do not claim a public release exists.

Run from the repository root:

```sh
npm --prefix scripts/glob-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vglob/test/*.test.cjs
node scripts/glob-conformance/contract.cjs
node scripts/glob-conformance/upstream.cjs
node scripts/glob-conformance/callers.cjs
node scripts/glob-conformance/archives.cjs
bun test packages/vglob/test
bun scripts/glob-conformance/contract.cjs
bun scripts/glob-conformance/callers.cjs
```

This is selected public-contract coverage, not the complete upstream suite.
Upstream private-object introspection, CLI behavior, native Windows execution
and unbounded cyclic symlink expansion are outside the verified scope.
See [vglob](../../packages/vglob/README.md) for the supported API and differences.
