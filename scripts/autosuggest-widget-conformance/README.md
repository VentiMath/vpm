# Navigation widget conformance

Pinned controls: react-autosuggest 10.1.0 (current and VentiMath pin), React/DOM
19.1.0 and React declaration fixtures. Upstream is a development oracle only.
The VPM runtime was independently written against the public contract and
observed behavior; no upstream widget runtime or private app source is vendored.

```sh
npm --prefix scripts/autosuggest-widget-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/autosuggest-widget-conformance/run.cjs
bun scripts/autosuggest-widget-conformance/run.cjs
node scripts/autosuggest-widget-conformance/archives.cjs
```

`run.cjs` compares 64 server-rendered cases: flat/grouped, empty/populated,
closed/always-visible, default/custom themes, present/absent section titles, literal text and ARIA markup.
`browser.cjs` uses native Chrome and trusted keyboard/mouse input. The paired
fixtures exercise controlled values, highlight/wrap/restoration, Enter/Escape,
fetch/clear/selection callbacks, custom input and portaled suggestions, focus,
minimum query length, automatic focus and delayed results. Parent rerenders must
retain input/result DOM identity. Additional assertions cover composition,
empty leading groups, result delivery after blur and ref forwarding. Grouped
null-highlight corrections and redundant upstream notifications are explicitly
distinguished in comparisons, not treated as identical behavior.

The public fixture follows the two FuseSearch caller configurations using
synthetic labels. A separate local check mounted the unchanged private FuseSearch
source with its real MUI TextField/Popper and MemoryRouter: both basic/full
variants passed eight navigation and DOM/focus checks against each implementation.
The private source is not copied into this repository. These checks do not claim
authenticated application acceptance, pixel-identical styling or app adoption.

`archives.cjs` packs the four-package VPM closure, byte-checks the extracted
files, installs them with fresh and frozen npm/Bun lockfiles using local archive
overrides for the unreleased internal dependencies, verifies CJS/ESM
and TypeScript 7 NodeNext/Bundler consumers, reruns Node/Bun contracts and Chrome,
and rejects installation of the old upstream runtime dependencies.

[Package scope](../../packages/vreact-autosuggest/README.md) and
[controlled benchmarks](../../packages/vreact-autosuggest/bench/results/README.md)
document differences and limits.
