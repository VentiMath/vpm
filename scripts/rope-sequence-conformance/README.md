# Rope sequence conformance

Pins rope-sequence **1.3.4**, history **1.5.1** and app history **1.5.0**. Both
history callers use the same model 1.25.12, state 1.4.4 and transform 1.12.5 controls
to isolate the sequence substitution. Upstream test source and license are retained
unchanged and verified by hash. Seed 42 makes its random slices reproducible.

```sh
npm --prefix scripts/rope-sequence-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/rope-sequence-conformance/run.cjs
node scripts/rope-sequence-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. The custom caller loader executes the unchanged CommonJS
module in function scope and substitutes only its rope dependency. It does not
mutate require caches. Every history snapshot asserts its items are instances of
the expected sequence, catching loaders that silently ignore the substitution.
Browser bundles use build-time substitution and run the same caller scenarios.

Five original test groups include 6,000 deterministic persistent edits. The
random oracle bounds sequence length to 8,192, so repeated self-concatenation
cannot make the test allocate exponentially. A separate 30,000-item build covers
long alternating prepend/append sequences. Storage detachment and strict invalid
bounds are intentional differences from upstream.

Exact one-package npm/Bun consumers repeat contracts and both history callers,
check fresh/frozen installs, module identity, TS7 NodeNext/Bundler declarations
without ambient platform types, and execute browser bundles from installed files.
Browser DOM/IME and application adoption belong to later editor work.

[Measurements](../../packages/vrope-sequence/bench/results/README.md) retain all
isolated process samples, control noise and source hashes; they include a current
history edit/undo workload. History itself remains upstream in these comparisons.
