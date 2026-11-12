# vvite-tsconfig-paths

Independent path-alias plugin targeting stable **vite-tsconfig-paths 6.1.1** and the non-compiler configuration VentiMath uses. Version 7 remains a prerelease at the recorded comparison date.

```js
import tsconfigPaths from 'vvite-tsconfig-paths';
export default { plugins: [tsconfigPaths({ parseNative: false })] };
```

The verified contract resolves exact and wildcard `paths`, inherited path roots, fallback targets, `baseUrl`, query suffixes and ordinary include/exclude patterns. It preserves Vite's resolver context and passes `skipSelf` to avoid recursion. Importers follow TypeScript/`allowJs` selection, `loose`, or `importerFilter`. Eager and lazy discovery, project lists, custom configuration names, references and skipped directories are supported. Discovery defaults to the Vite project root; automatic discovery beyond it into a parent workspace is outside this application's contract—set `root` explicitly.

The only runtime dependency is `vtsconfck`. Node 24/Bun 1.4.4 native glob matching replaces `globrex`; no debug helper or TypeScript compiler is loaded. Compiler-backed parsing and file logging reject explicitly. Configuration errors warn and are skipped, or are silenced with `ignoreConfigErrors`. Full TypeScript compiler resolution is not claimed.

Include/exclude decisions have a bounded cache scoped to each configuration snapshot. Resolved module results are never cached, so a previously missing target can appear without poisoning later resolutions. JSON configuration events invalidate discovery, and shutdown removes watcher listeners. Vite's project watcher owns which external files are observed; explicit build `watchChange` also invalidates configuration.

[Conformance](../../scripts/vite-paths-conformance/README.md) compares current and app controls, real builds and the actual app alias map read-only. [Benchmarks](bench/results/README.md) measure isolated resolver/setup work, not whole-build throughput. [Provenance](PROVENANCE.json) describes scope. Source completion is separate from publication or app adoption.

Final isolated measurements show lower time in every process pair beyond control spread: repeated aliases about 34% on Node / 35% on Bun, non-alias lookups 56% / 60%, and configuration/setup 37% / 45%. Filesystem setup timings vary substantially; none of these imply an equal whole-build improvement.
