# Autosuggest highlight conformance

The development fixture pins autosuggest-highlight **3.3.4**, both the current
upstream release and the VentiMath navigation-search pin. It is not a runtime
dependency. `upstream/` retains two unchanged MIT test files from commit
`421036daa7c1145b6ee7ae77a53eb4735caf8c9a`, their license and SHA-256 hashes.
`run.cjs` verifies those hashes and runs all 36 tests against upstream and VPM.

```sh
npm --prefix scripts/autosuggest-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/autosuggest-conformance/run.cjs
bun scripts/autosuggest-conformance/run.cjs
node --test packages/vautosuggest-highlight/test/contracts.test.cjs
bun test packages/vautosuggest-highlight/test/contracts.test.cjs
node scripts/autosuggest-conformance/archives.cjs
```

The differential suite compares 6,000 seeded text/query/options combinations,
including all eight option combinations, case, Latin accents, punctuation,
repeated terms and adjacent matches. Original contract groups cover invalid
ranges and deliberate Unicode corrections; 3,000 generated Unicode cases verify
that the output reassembles the source and never splits surrogate pairs.
`callers.cjs` reproduces the navigation-search filtering/highlighting pipeline with
synthetic labels and the caller's ten-result cap. This does not claim the app has
adopted the package or that an authenticated application UI was exercised.

`archives.cjs` tests the exact packed files via fresh/frozen npm and Bun installs,
Node/Bun contracts and differential checks, root/subpath CJS/ESM identity,
TypeScript 7 in NodeNext and Bundler modes without ambient platform declarations,
and execution of the browser-target bundle in an empty global context. This
pure string library does not need layout or DOM for its contract tests.

[Package documentation](../../packages/vautosuggest-highlight/README.md) lists
intentional differences. [Measurements](../../packages/vautosuggest-highlight/bench/results/README.md)
use isolated processes and preserve every comparison/control sample.

An additional local check ran the unchanged VentiMath `getSuggestions` and
`renderSuggestion` functions from the provenance commit, using synthetic labels
and React element output: 12 queries and 40 rendered suggestions matched upstream.
The private application source is not copied into this public fixture. This was
a caller-contract check, not a mounted application/browser test.
