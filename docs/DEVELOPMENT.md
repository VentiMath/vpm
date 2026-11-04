# Developing VPM

Use **Node.js 24**, **Bun 1.4.4**, and the workspace's **TypeScript 7.1** compiler.
TypeScript 7.1.0 is due in November 2026; until it is released the workspace pins
7.1.0-beta, and moves to 7.1.0 when it ships. 7.0.2 remains the declared minimum
where packages state one.
Every runtime package declares `engines.node: ">=24"`; earlier Node versions are
outside the support contract. Browser compatibility remains package-specific.
The documentation gate checks the runtime declaration on every package.
Package archives use standard metadata and can be installed with existing tools.
[Calendar installation and release packaging](INSTALLATION.md) use public GitHub
Release URLs, with internal dependencies pinned inside the published archives.
A standalone VPM CLI, registry and native Bun integration remain future work.

## Setup

From the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
for lockfile in scripts/*/package-lock.json; do
  npm --prefix "${lockfile%/package-lock.json}" ci --ignore-scripts --no-audit --no-fund
done
npm --prefix scripts/radix-effect-event-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-id-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-state-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-use-size-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-arrow-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-popper-conformance/current ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-collection-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-collection-conformance/current ci --ignore-scripts --no-audit --no-fund
bun scripts/radix-popper-conformance/build.cjs
bun scripts/radix-collection-conformance/build.cjs
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
node scripts/check-body-options.cjs
bun scripts/check-body-options.cjs
node scripts/integration-offline.cjs
bun scripts/integration-offline.cjs
node scripts/check-media-archives.cjs
```

The root suites test individual packages. Integration replaces supported upstream
packages inside pinned consumers and exercises their real caller paths. It reports
unsupported installed versions separately; verified replacement coverage does not
mean the application has adopted or deployed it. The offline wrapper supplies an
empty ADC directory and a local metadata endpoint; it does not use developer
credentials or a live GCE metadata service. Individual metadata tests can replace
that endpoint with their own local fixtures.

Public declarations must compile without ambient Node, Undici or DOM types.
The archive gate packs every runtime package and verifies isolated installation,
CommonJS/ES imports and TypeScript consumers. It also checks that tests, benchmarks
and upstream fixtures stay out of the archives.

The two platform declaration packages have additional checks:

```sh
node scripts/sync-types.cjs --check
npm run test:types
node scripts/check-type-archives.cjs
```

The workspace and declaration fixtures use the configured TypeScript 7 compiler.
Runtime declarations are checked with NodeNext and bundler resolution; browser
fixtures include their required DOM and React types. Platform baselines are documented in
[vnode-types](../packages/vnode-types) and [vundici-types](../packages/vundici-types).
They do not change the Node 24 runtime target.

The [CI workflow](../.github/workflows/ci.yml) is the complete executable list,
including upstream conformance and caller controls on both runtimes. The
[verification record](../IMPROVEMENTS.md#current-verification) links those suites
and records known limitations.

See the [build-dependency audit](BUILD-DEPENDENCIES.md) before replacing Babel
packages: unused transforms, tool-only requirements and runtime helpers have
different removal paths.

## Replacing a package

Start with its actual callers and check the latest stable upstream release and
dependency graph. Pin comparison sources and their integrity, preserve licensing,
and identify the API scope needed by consumers. Prefer native runtime facilities
where they satisfy those requirements. Older compatibility can be retained when
useful; prereleases need an explicit target.

Implement and test the behavior, compare it with upstream, then exercise the
callers. Check public types and installed archives. Benchmarks should retain
inputs, methodology, raw measurements and source hashes; include regressions and
controls rather than selecting only favorable cases. Retained reports preserve the
metadata and source hashes recorded when measured. An engine-only metadata change
does not alter those samples; `--verify-current` can report a manifest mismatch
until a fresh measurement is recorded. Do not rewrite old hashes to imply a rerun.

Measurements use `scripts/bench-process.cjs`, through the compatible
`bench-paired.cjs` entry. Each timed variant runs in a separate fresh process;
four comparison pairs balance upstream-first and VPM-first order. Two additional
pairs compare identical upstream source in separate processes. Raw samples,
per-process medians, both order groups, controls and source hashes are retained.
Node measurements require Node 24; Bun records its actual version. Results are
validated outside timing and no samples are trimmed. Case factories must construct only
that worker's selected variant: do not call `make(upstream)` at module scope to
compute expected values. Use pinned output fixtures generated outside the
benchmark run. `scripts/bench-library.cjs` loads neither implementation in the
coordinator and only the selected library in each timed worker. Keep SDK caller
setup inside the selected factory too. Loading both libraries or executing an
oracle in a timed worker can reintroduce setup bias even when its timer covers
only one implementation. Process isolation limits
shared JIT feedback; machine load, GC and runtime variation can still matter.

Run one recording per runtime, with `OUTPUT` set to a JSON path. Each recording
already includes its controls. `CALIBRATION=1` records only control pairs.
`BENCH_FIRST=vpm` reverses the starting order without changing the balance.
The second worker in each pair uses the first worker's iteration counts.
A reported direction is unestablished if it reverses across processes or any
pair overlaps the observed control spread (with a minimum 2% precision floor).
This is a conservative descriptive check, not a statistical confidence interval.

Older same-process reports remain historical evidence. Shared call sites and
warmup order could favor one implementation, and their same-instance control
could miss that effect. Small gains and regressions in those reports are
provisional until remeasured; there is no universal 15% correction. Never relabel
a Node 22 report as Node 24 or change old hashes to imply a rerun.

Package replacements implement the APIs required by real consumers. Changing
imports and retaining an upstream build is a fork, not a new implementation.
Record the implementation approach explicitly, keep independent caller and
upstream behavioral checks, and distinguish generated schemas and contract data
from executable implementation. A compatibility test passing does not establish
that a package has been independently implemented.

A package README identifies the upstream version, explains specific fixes and
intentional differences, and links to the supporting tests and benchmarks.
`PROVENANCE.json` records source origins and changes. Keep the central
[comparison catalog](../IMPROVEMENTS.md#package-comparison) accurate, including
compatibility gaps. A tested caller path is evidence for that path, not a claim
of complete upstream parity.

Keep the root README focused on the project's purpose and standards. Package
inventories, progress, measurements and fixture instructions belong in the catalog,
package READMEs and this guide.

Progress inventories must include the current application's production dependency
roots, not just the historical comparison fixture. Keep implementation, published
artifacts and committed adoption distinct; verify adoption from resolved release
URLs. [Backend coverage](BACKEND.md) records the current boundary and missing roots.
