# Minimatch conformance

Current control: minimatch 11.0.9 (git v11.0.9, e89926755f3f79cf79f1087bd5730ed4d7eba60e). Historical controls: 5.1.9, 9.0.9 and 10.2.4. Caller controls: glob 13.0.6 and Redocly OpenAPI Core 1.34.10. All are exact dev-only dependencies with an npm lockfile.

`patterns.mjs` and `upstream/` are unmodified tests from that upstream tag, except the patterns file's extension. `windows-cases.json` extracts the case data from `test/unc.ts`. Their Blue Oak license is retained in `UPSTREAM-LICENSE`. None ships in the runtime archive.

```sh
npm --prefix scripts/minimatch-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vminimatch/test/*.test.cjs
bun test packages/vminimatch/test
node scripts/minimatch-conformance/callers.cjs
bun scripts/minimatch-conformance/callers.cjs
node scripts/minimatch-conformance/archives.cjs
OUTPUT=packages/vminimatch/bench/results-node.json node packages/vminimatch/bench/compare.cjs
OUTPUT=packages/vminimatch/bench/results-bun.json bun packages/vminimatch/bench/compare.cjs
```

`fixture.cjs` copies pinned dev fixtures to an isolated temporary directory, substitutes only minimatch entry points, and counts actual replacement calls. Glob runs through its published `glob/raw` entry, since its default entry embeds its dependencies. Tests cover sync/async discovery, ignores, dotfiles, case handling, numeric ranges, partial traversal and URL-based headers. All network responses are synthetic. Archives install the full unpublished VPM dependency closure with explicit local overrides; this is install evidence, not a public release.
