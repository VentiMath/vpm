# Path-scurry verification

The locked controls are current path-scurry 3.0.0, the app's 2.0.2, and glob
13.0.6. VPM runtime code was written independently; upstream source in
`upstream/` contains tests and expected snapshots only, under its Blue Oak
license. The fixture is development-only and is excluded from package archives.

- `contract.cjs`: 59,256 comparisons across POSIX, Darwin and Windows paths,
  case/Unicode identities, filesystem operations, filters, symlinks, walks and
  streams. The older Windows root behavior intentionally changed by upstream 3
  is compared only to 3.0.0. Both controls otherwise run the same contracts.
- `callers.cjs`: 278 checks through unchanged glob 13.0.6 `glob/raw`, including
  sync/async discovery, streams, partial consumption, symlinks/cycles, realpath,
  stats, casing, ignore patterns, depth and abort. Replacement constructors are
  counted so the bundled default cannot accidentally act as the implementation.
- `upstream.cjs`: 17 of 20 unchanged upstream test groups, 1,723 passing
  assertions on Node. Bun strips TypeScript without bundling dependencies. Test
  filenames in snapshot keys/fixture paths are relocated; expected values and
  assertions are unchanged. The platform-specific, IFMT and weird-readdir groups
  mock upstream imports and are excluded; VPM's own tests cover those behaviors
  through its public platform classes and filesystem injection. This is a
  selected upstream run, not full-suite parity. The TAP harness requires Node.
- `archives.cjs`: packs all three VPM dependencies, tests clean and frozen npm
  and Bun installs, runs unchanged callers on both runtimes, and checks TS7
  NodeNext/Bundler consumers. Explicit local dependency pins/overrides avoid
  registry resolution. A future release must pin its internal archive URLs.
- Package tests cover the contracts above plus a 140,000-entry directory,
  backpressure/destruction, callback timing, promise overrides, fresh stat
  metadata and the resolved-string cache after `chdir()`.

```sh
npm --prefix scripts/path-scurry-conformance ci --ignore-scripts
node --test packages/vpath-scurry/test/*.test.cjs
node scripts/path-scurry-conformance/upstream.cjs
node scripts/path-scurry-conformance/contract.cjs
node scripts/path-scurry-conformance/callers.cjs
node scripts/path-scurry-conformance/archives.cjs
bun test packages/vpath-scurry/test
bun scripts/path-scurry-conformance/contract.cjs
bun scripts/path-scurry-conformance/callers.cjs
```

The `chdir()` regression is deliberately asserted against the correct new
working directory rather than copied from upstream's stale cached result.
The main application is not modified by these fixtures.
