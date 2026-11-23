# Brace expansion and build callers

Current control: brace-expansion 5.0.13, git commit
`420ede4ada8375a94c8afa31d62fc038da44b9a1`. Application controls: 5.0.4 and
2.0.2, as installed below glob/minimatch in VentiMath's lockfile. Registry code
is used only in this private test fixture. `fixtures/bash-results.txt` is the
unchanged published upstream test corpus; its MIT license is retained beside it.

```sh
npm --prefix scripts/brace-expansion-conformance ci --ignore-scripts
node --test packages/vbrace-expansion/test/*.test.cjs
bun test packages/vbrace-expansion/test
node scripts/brace-expansion-conformance/callers.cjs
bun scripts/brace-expansion-conformance/callers.cjs
node scripts/brace-expansion-conformance/archives.cjs
```

The Bash cases run against VPM and pinned controls. Zero-step ranges only run
against the current control: the older controls do not safely advance them.
Generated cases use the current contract; a recorded malformed-input difference
shows the older 2.x empty-result behavior instead of claiming universal 2.x
parity. Independent tests cover finite output/work budgets, NaN defaults, deep
nesting, product chains, adversarial rewrites, unsafe integers and literal NUL.

Caller checks copy unchanged minimatch 5/9/10 and glob 13 source, replacing only their
brace-expansion resolution. They compare brace output and matching, including
actual temporary file enumeration synchronously and asynchronously. Archive
checks install both VPM packages with an explicit local-archive override for
the unpublished delimiter dependency, verify frozen npm/Bun reinstalls and run the
same callers from those installed files. Types compile under TypeScript 7 with
NodeNext/Bundler resolution and no Node/DOM ambient declarations.

Glob 13's default entry bundles dependencies, so an installed brace-expansion
override cannot alter that embedded copy. The conformance check uses its
published `glob/raw` source entry with external dependency resolution and
compares against the default bundled control. A call counter proves that the
raw entry invokes the replacement. Replacing glob's bundled copy requires its
own caller rewrite or explicit consumer integration; this leaf does not claim
to change VentiMath's installed bundle.
