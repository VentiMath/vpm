# Venti Package Manager

Venti Package Manager (VPM) is building a carefully maintained JavaScript package
ecosystem, starting with the small dependencies that support real applications.
The goal is a broad collection of packages with understandable source, reliable
behavior, useful types, and a deliberate dependency graph.

We start by inspecting the dependencies an application actually installs, tracing
each package to its callers, and understanding the behavior those callers need.
We then build recognizable VPM counterparts, usually with familiar APIs and names,
and improve their implementations where the evidence supports a change.

## What belongs here

Every package should have:

- A clear purpose and a documented reason to exist.
- Readable source and accurate TypeScript declarations.
- Focused tests for the behavior its consumers rely on.
- Justified dependencies and an explicit runtime baseline.
- Documented differences from the package it replaces.
- Traceable origins, license notices, and release contents.

An extensive catalog should still let each application install only what it
needs. Replacements may simplify older compatibility code or redesign an API when
that produces a concrete improvement. Compatibility decisions belong in each
package's documentation.

## Starting with the foundations

The first package is [`vee-first`](packages/vee-first): a dependency-free utility
that waits for the first of several EventEmitter events, removes the competing
listeners, and invokes a callback once. It is a modernized counterpart to
[`ee-first`](https://github.com/jonathanong/ee-first), with TypeScript declarations
and stronger handling of duplicate and reentrant events.

| Package | Purpose | Runtime dependencies |
| --- | --- | --- |
| [`vee-first`](packages/vee-first) | First event wins, with listener cleanup and cancellation | 0 |

## Installation and Bun

Packages use standard `package.json` metadata and exports so existing JavaScript
tools can consume them. Bun is the workspace package manager. Each package can be
packed and installed through the package and tarball mechanisms available today.

Native VPM support in `bun install` is a long-term goal. The path is to demonstrate
the value of the collection through package quality, compatibility, dependency
simplicity, and real application use, then pursue integration with Bun. This
repository currently contains the first package; a VPM registry, a standalone
package-manager CLI, and native Bun integration are future work.

## Development

```sh
bun install --frozen-lockfile
bun run test
bun run test:bun
bun run typecheck
```

Tests run against Node.js and Bun. `vee-first` has no runtime dependencies; the
workspace uses TypeScript and Node.js type declarations for development checks.

See the [package README](packages/vee-first/README.md) for usage, compatibility,
and installation from a local package archive.

## Repository history

All branches require linear history and reject force pushes. Pull requests use
squash merges only. The history rules have no bypass actors, including admins.

## License

MIT. Upstream copyright and license notices are preserved in each derived package.
