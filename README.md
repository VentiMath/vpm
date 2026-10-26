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
```

Tests run against Node.js and Bun. The workspace uses TypeScript and Node.js type
declarations for development checks. The integration gate installs a pinned
upgrade target for ventimath's HTTP consumers and drives it with every VPM
package aliased in:

```sh
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
```

It runs in CI on every push. See [the target dependency graph](IMPROVEMENTS.md#the-target-dependency-graph)
for what it covers and what it reports as not covered. Each package documents its own installation,
usage, runtime requirements, and compatibility.

## Repository history

All branches require linear history and reject force pushes. Pull requests use
squash merges only. The history rules have no bypass actors, including admins.

## License

MIT. Upstream copyright and license notices are preserved in each derived package.
