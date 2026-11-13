# MUI styling adapter conformance

Pinned controls: @mui/styled-engine and @mui/system **9.5.0**, app-pinned **7.2.0**, Emotion 11.14, React 19.3.1. Install the fixture with `npm --prefix scripts/mui-engine-conformance ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps`.

- `run.cjs`: 2,060 comparisons across serialized style objects, prop filtering, SSR CSS/classes, GlobalStyles fallback, style inheritance and keyframes. Run with Node and Bun.
- `callers.cjs`: 24 unchanged current/app MUI System snapshots cover themed styling, inheritance, overrides, variants, sx, nested themes and global CSS. VPM variants use the VPM Emotion family and private theme context together; controls retain their corresponding upstream dependencies.
- `browser.cjs`: headless Chrome checks both caller versions, in production and with `VPM_REACT_MODE=development`/Strict Mode. It checks real computed styles, LTR/RTL application caches, the app's CSS-layer plugin, focused DOM retention and global stylesheet disposal. Run with Node; no saved application settings are changed.
- `types.cjs`: TypeScript 7 strict CJS/ESM/bundler consumers and unchanged MUI System styled declarations, including rejected missing/mistyped props and unsupported provider options.
- `archives.cjs`: recursively packs every VPM runtime dependency with exact local archive pins, then performs fresh and frozen npm/Bun installs, Node/Bun ESM/CommonJS/subpath SSR and declaration checks. No workspace links or upstream Emotion runtime are available to consumers.
- [Package regressions](../../packages/vmui-styled-engine/test/engine.test.cjs) cover reentrant getters, frozen style inputs, derived style mutation, fallback themes and explicit scope errors. Node and Bun run all five tests.

VentiMath audit revision: `664673678be2699602121ff2ceee0189c12a7e12`. `src/contexts/RootThemeProvider.tsx` owns `muiltr`/`muirtl` caches, RTL and `@layer mui` plugins. The fixture retains that caller policy. It does not claim application adoption or full MUI material coverage.

[Balanced benchmarks](../../packages/vmui-styled-engine/bench/results/README.md) measure style serialization, component creation, component SSR and themed global SSR in separate selected-implementation processes. Each uses four alternating pairs and two identical-source controls; results cover the entire chosen Emotion stack, not just the small bridge. Browser performance is not measured.
