# Reselect conformance

Pinned current5.3.0 and app5.1.1 are black-box controls. Only public API docs and
declarations were consulted for the implementation. MUI X8.7.0's store selector
wrapper is bundled unchanged with each runtime, using synthetic states.

- `node --test packages/vreselect/test/*.test.cjs` (also Bun): cache identity,
  eviction, arity, counters, errors, nullish results, nested state and mixed-key
  deterministic traces; current generational bounds separately.
- `node scripts/reselect-conformance/development.cjs`: diagnostic frequencies.
- `node scripts/reselect-conformance/callers.cjs`: unchanged MUI wrapper values,
  reference reuse and recomputation counts.
- `node scripts/reselect-conformance/types.cjs`: strict TS7 NodeNext/Bundler,
  typed state, result/parameter inference and negative consumers.
- `node scripts/reselect-conformance/archives.cjs`: exact packed, fresh/frozen
  npm and Bun installs, Node/Bun imports, browser bundling and caller/type checks.

These establish component/API behavior, not whole-app integration or adoption.

Build benchmark callers first with `node scripts/reselect-conformance/build.cjs`;
then follow the package measurement commands. Node and Bun runs must be
sequential, with no concurrent tests or other CPU-heavy jobs.
