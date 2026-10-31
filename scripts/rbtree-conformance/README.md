# Red-black tree conformance

Baseline: **functional-red-black-tree 1.0.1**, the npm tarball recorded in the
package [provenance](../../packages/vfunctional-red-black-tree/PROVENANCE.json),
checked October 31, 2026. The original source, tests, license, README and
manifest are retained under `upstream/` (source and tests use a `.txt` suffix to
avoid root test discovery) and verified against `SHA256.json` before execution.
The retained source must also match the installed npm copy byte for byte.

```sh
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/gax-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/rbtree-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/rbtree-conformance/run.cjs --upstream
node scripts/rbtree-conformance/run.cjs
node scripts/rbtree-conformance/regressions.cjs
node scripts/rbtree-conformance/callers.cjs --upstream
node scripts/rbtree-conformance/callers.cjs
```

Repeat the runtime commands with Bun. `run.cjs` executes the original tape suite
in a child process, redirecting only its `require('../rbtree.js')` to VPM or,
with `--upstream`, to the installed original. All **9 tests and 25,663
assertions** pass unchanged on both runtimes, including the suite's red-black
invariant checks on internal nodes; no skips or expectation rewrites. tape 2.14.1
and iota-array 0.0.1 are the suite's own declared test dependencies.

`regressions.cjs` reproduces the original's failures before asserting the
replacement: `at()` throwing on an empty tree, `at(NaN)` returning the first
entry, and a non-function comparator accepted until the second insert fails.

`callers.cjs` runs the actual Firestore **9.4.0** SDK pinned in the
[protobuf fixture](../protobuf-conformance/package.json). A private module loader
substitutes only `functional-red-black-tree` inside its modules; an import count
proves the substitution. An `onSnapshot` query receives a local gRPC Listen stream
(three documents, then a reorder, an insert and a delete) and must produce the
same ordering, added/modified/removed indexes and retained earlier snapshot with
either tree. The local server uses the gRPC packages from the
[gax fixture](../gax-conformance/package.json). No network, credentials, SDK source
edits or application changes are involved.
