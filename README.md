# Venti Package Manager

Venti Package Manager (VPM) is building a comprehensive JavaScript package
ecosystem with a consistent standard of quality across the entire dependency
graph: application libraries, development tools, shared utilities, and the
smallest underlying primitives.

The vision is a large collection of pristine packages: understandable source,
well-defined behavior, accurate types, disciplined dependencies, and traceable
releases. Applications should be able to choose from a broad catalog while
installing only what they need.

See **[VPM improvements](IMPROVEMENTS.md)** for the package-by-package comparison:
verified fixes, API improvements, benchmark results, and compatibility tradeoffs.

## Recognizable packages, carefully maintained

VPM packages begin as recognizable counterparts to existing packages, generally
preserving familiar boundaries and APIs under VPM names. Each implementation is
examined on its own merits. Improvements can include simpler source, stronger
tests, clearer documentation, fewer dependencies, and an explicit baseline for
supported runtimes.

API changes and larger redesigns are possible when they provide a concrete
benefit. Each package documents its compatibility decisions and differences from
its upstream counterpart.

## The package standard

- **Understandable:** a clear purpose, readable implementation, and useful docs.
- **Verified:** tests cover the behavior consumers rely on, including edge cases.
- **Typed:** TypeScript declarations accurately describe the public API.
- **Deliberate:** every dependency has a reason, and runtime requirements are explicit.
- **Traceable:** origins, licenses, changes, and versioned release contents are recorded.

Work proceeds from real dependency graphs. We trace packages to their callers,
identify the behavior those callers need, and use that evidence to guide each
replacement. Package-level details live alongside the source in [`packages/`](packages/).

## Current scope

The collection covers the Express 5 HTTP stack: routing, request bodies, cookies,
content negotiation, static files, response handling, and the utilities beneath
those APIs. `vexpress` uses VPM packages throughout its runtime dependency tree;
`vcors` adds cross-origin request handling. Backend startup utilities include
command-line argument parsing. Two declaration-only packages provide Node and
Undici types for development.

Integration tests exercise these replacements inside pinned Google Functions
Framework and Firebase Functions consumers. Those frameworks and the wider
Firebase/Google SDK dependency trees still contain upstream packages. Application
adoption and deployment are separate from these compatibility tests.

The [package catalog and evidence](IMPROVEMENTS.md#package-comparison) records
implemented replacements, compatibility differences, and measured tradeoffs.

## Package management and Bun

Packages use standard `package.json` metadata and exports so existing JavaScript
tools can consume them. Bun manages this workspace, and packages can be packed
and installed using standard package archives.

The long-term goal is native VPM support in `bun install`, earned through
demonstrable improvements in quality, compatibility, dependency simplicity, and
real application use. The project is in early development; the package collection
is growing, while a VPM registry, standalone package-manager CLI, and native Bun
integration remain planned work.

## Development

```sh
bun install --frozen-lockfile
bun run test
bun run test:bun
bun run typecheck
bun run check:docs
```

Tests run against Node.js and Bun. The workspace uses TypeScript 7.0.2 with VPM's
`vnode-types` and `vundici-types` for development checks. These declaration-only
packages have separate compiler and Node API baselines; their documentation
explains adoption and compatibility. Runtime packages retain self-contained
public declarations. The platform type gate checks pinned upstream comparisons,
TypeScript 7, Node-only and DOM projects, and installed package archives. All
compiler checks use the supported CLI; no legacy compiler is installed.
The separately locked [upstream type fixture](scripts/type-consumers/README.md)
keeps original declarations and an Undici runtime solely for comparison tests;
they are outside the workspace and excluded from VPM package archives:

```sh
npm --prefix scripts/type-consumers ci --ignore-scripts
node scripts/sync-types.cjs --check
npm run test:types
node scripts/check-type-archives.cjs
```

The HTTP integration gate installs pinned backend consumers and exercises them
with supported upstream packages replaced by their VPM counterparts:

```sh
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

It runs in CI on every push. See [the target dependency graph](IMPROVEMENTS.md#the-target-dependency-graph)
for what it covers and what it reports as not covered. Each package documents its own installation,
usage, runtime requirements, and compatibility.

Larger replacements also run pinned upstream compatibility suites. The
[Express conformance fixture](scripts/express-conformance/README.md) tests the
application layer and example applications, with every intentional expectation
change and runtime limitation recorded. Its separately locked dependencies stay
outside the workspace and published package archives.

## License

Repository-owned code is MIT unless a package states otherwise. Derived packages
preserve their upstream licenses and copyright notices. Check each package's
LICENSE and metadata.
