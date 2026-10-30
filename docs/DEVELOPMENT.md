# Developing VPM

Use **Node.js 24**, **Bun 1.4.0**, and the workspace's **TypeScript 7.0.2** compiler.
Package archives use standard metadata and can be installed with existing tools.
A standalone VPM CLI, registry and native Bun integration remain future work.

## Setup

From the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
for lockfile in scripts/*/package-lock.json; do
  npm --prefix "${lockfile%/package-lock.json}" ci --ignore-scripts --no-audit --no-fund
done
```

These separately locked fixtures contain original packages, SDK callers and test
helpers. They are comparison tools, outside the workspace's runtime dependencies
and excluded from installable package archives. Individual fixture READMEs explain
their baselines and source adaptations.

## Checks

```sh
bun run test
bun run test:bun
bun run typecheck
bun run check:docs
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

The root suites test individual packages. Integration replaces supported upstream
packages inside pinned consumers and exercises their real caller paths. It reports
unsupported installed versions separately; verified replacement coverage does not
mean the application has adopted or deployed it.

Public declarations must compile without ambient Node, Undici or DOM types.
The archive gate packs every runtime package and verifies isolated installation,
CommonJS/ES imports and TypeScript consumers. It also checks that tests, benchmarks
and upstream fixtures stay out of the archives.

The two platform declaration packages have additional checks:

```sh
node scripts/sync-types.cjs --check
npm run test:types
node scripts/check-type-archives.cjs
node scripts/check-legacy-types.cjs
```

The workspace builds with TypeScript 7. The isolated legacy compiler gate only
checks that public declarations remain usable by downstream TypeScript 5.8/5.9
applications. Platform declaration baselines are documented in
[vnode-types](../packages/vnode-types) and [vundici-types](../packages/vundici-types).
They do not change the Node 24 runtime target.

The [CI workflow](../.github/workflows/ci.yml) is the complete executable list,
including upstream conformance and caller controls on both runtimes. The
[verification record](../IMPROVEMENTS.md#current-verification) links those suites
and records known limitations.

## Replacing a package

Start with its actual callers and check the latest stable upstream release and
dependency graph. Pin comparison sources and their integrity, preserve licensing,
and identify the API scope needed by consumers. Prefer native runtime facilities
where they satisfy those requirements. Older compatibility can be retained when
useful; prereleases need an explicit target.

Implement and test the behavior, compare it with upstream, then exercise the
callers. Check public types and installed archives. Benchmarks should retain
inputs, methodology, raw measurements and source hashes; include regressions and
controls rather than selecting only favorable cases.

A package README identifies the upstream version, explains specific fixes and
intentional differences, and links to the supporting tests and benchmarks.
`PROVENANCE.json` records source origins and changes. Keep the central
[comparison catalog](../IMPROVEMENTS.md#package-comparison) accurate, including
compatibility gaps. A tested caller path is evidence for that path, not a claim
of complete upstream parity.

Keep the root README focused on the project's purpose and standards. Package
inventories, progress, measurements and fixture instructions belong in the catalog,
package READMEs and this guide.
