# MUI System conformance

The pinned controls are System and Material **9.5.0**, plus the app's **7.2.0**, with React **19.3.1**. The fixture uses package APIs and published declarations as controls; VPM's System runtime is independently written. `aliases.cjs` substitutes System, Utils, Private Theming, Styled Engine and Emotion underneath unchanged Material callers. The same RTL plugin is supplied to both controls.

- `primitives.cjs`: 16,364 spacing, breakpoint, token, responsive array/object and nested `sx` comparisons.
- `colors.cjs`: 7,168 color comparisons.
- `variables.cjs`: 984 CSS-variable generation and responsive-value comparisons.
- `callers.cjs`: 16 unchanged Material form/menu/tab/dialog SSR snapshots. Generated style identifiers are mapped one-to-one and attributes sorted; CSS values and HTML are preserved. The one omitted upstream rule, `-webkit-print-color-scheme`, is a documented Stylis hash-collision bug; the browser verifies that it is unsupported.
- `browser.cjs`: current/app Material menus, fields, tabs and dialogs, then 32 layout snapshots across wide/narrow viewports, RTL/LTR, light/dark and ordinary/CSS-variable providers. Nested grids inherit spacing and columns. Styled templates, variants, overrides and theme defaults are checked. Focus and input selection survive theme changes within each provider mode. Media queries preserve subscriptions during parent renders, detach on unmount, and hydrate existing server DOM. Color-mode changes target the supplied element.
- `types.cjs`: strict TypeScript 7 NodeNext and Bundler consumers including the unchanged Material declarations; no skipped declaration checking.
- `archives.cjs`: the complete VPM dependency closure is packed with pinned local archive URLs, freshly installed and frozen-installed with npm and Bun, then checked for Node/Bun SSR, every CJS/ESM entry, types and the same Chrome caller behavior. No workspace links or registry-name fallback for internal dependencies.

Run `npm ci --ignore-scripts --legacy-peer-deps` in this directory, then the scripts above from the repository. The package regression tests also exercise cyclic inputs, finite values, prototype-safe objects and input ownership. Node 24 and Bun 1.4.4 are the supported test runtimes; browser evidence is Chrome on React 19.3.1, not Safari/Firefox acceptance or application deployment.

[Benchmark driver](../../packages/vmui-system/bench/run.cjs) uses the repository's balanced process harness: isolated implementations, four comparison pairs, two identical-source controls, raw samples and source hashes. See [results](../../packages/vmui-system/bench/results/README.md). Source status and adoption are tracked separately.
