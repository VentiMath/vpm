# Vite path-alias conformance

Controls: stable vite-tsconfig-paths **6.1.1**, app **5.1.4**, and real Vite **6.3.5** builds. The implementation is independent and uses VPM's configuration reader plus native glob matching. It has no copied plugin runtime, globrex or debug dependency.

`run.cjs` checks 3,363 generated alias resolutions and builds: exact/longest wildcard precedence, missing-first fallback, inherited roots, importer extensions, loose mode, explicit projects/root, exclusions and query suffixes. `app.cjs` compares 60 paths from the actual private app configuration, read-only when available; none of that configuration is retained. Six regressions cover precedence, create/edit/delete invalidation, lazy child discovery, resolver options, missing targets and explicit unsupported options. TypeScript 7 checks declarations without ambient platform types. Packed CJS/ESM consumers on npm and Bun use a fully pinned two-package closure, with frozen reinstall checks.

```sh
npm --prefix scripts/vite-paths-conformance ci --ignore-scripts
node scripts/vite-paths-conformance/run.cjs
bun scripts/vite-paths-conformance/run.cjs
node --test packages/vvite-tsconfig-paths/test/plugin.test.cjs
bun test packages/vvite-tsconfig-paths/test/plugin.test.cjs
node scripts/vite-paths-conformance/app.cjs
node scripts/vite-paths-conformance/types.cjs
node scripts/vite-paths-conformance/archives.cjs
```

The [isolated benchmark](../../packages/vvite-tsconfig-paths/bench/results/README.md) separates repeated alias resolution, non-alias lookups and configuration/setup. Resolver callbacks are deterministic in both workers; actual Vite builds are separate correctness checks. No whole-application speedup is inferred. Root defaults to the project, not automatic parent-workspace discovery; compiler mode/file logs are excluded explicitly.
