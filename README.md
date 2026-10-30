# Venti Package Manager

Venti Package Manager (VPM) rebuilds JavaScript infrastructure with fewer
dependencies, stricter validation, and measured performance. Its goal is a
comprehensive package ecosystem with a consistent standard across the dependency
graph: application libraries, development tools, shared utilities, and the
smallest underlying primitives.

The vision is a large collection of pristine packages: understandable source,
well-defined behavior, accurate types, disciplined dependencies, and traceable
releases. Applications should be able to choose from a broad catalog while
installing only what they need.

See **[VPM improvements](IMPROVEMENTS.md)** for the package-by-package comparison:
verified fixes, API improvements, benchmark results, and compatibility tradeoffs.

## Recognizable APIs, rebuilt implementations

VPM packages begin as recognizable counterparts to existing packages, generally
preserving familiar boundaries and APIs under VPM names. Each implementation is
examined on its own merits. Improvements can include simpler source, stronger
tests, clearer documentation, fewer dependencies, and an explicit baseline for
supported runtimes.

API changes and larger redesigns are possible when they provide a concrete
benefit. Each package documents its compatibility decisions and differences from
its upstream counterpart.

## Latest stable compatibility

VPM prioritizes the APIs used by VentiMath's backend and frontend, including the
libraries they call. Latest stable upstream versions set the compatibility
target; actual consumers determine which behavior needs implementation and
verification first. A replacement need not reproduce every upstream feature.
Reuse native runtime facilities when they meet those callers' requirements.

Before starting or releasing a replacement, check upstream's current stable
release and dependency graph, pin that version in comparison fixtures, and test
the relevant public APIs, types, and consumers on Node.js 24 and Bun, adding
browser and toolchain checks where applicable. Retain older compatibility where
useful, and document intentional differences that improve
correctness or simplify the design. Prereleases require a separate explicit target.

Existing packages establish compatibility only with their documented, tested
versions and API scope. Caller-level checks do not establish complete package
parity. A completed replacement does not automatically establish parity with a
newer major release. Known gaps belong in the
[upgrade roadmap](IMPROVEMENTS.md#latest-stable-upgrade-roadmap), with dependency
upgrades preceding their callers.

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
command-line argument parsing and package-manifest discovery.
`vfunctions-framework` runs HTTP, CloudEvent and legacy event handlers on this
stack. `vjsonwebtoken`, `vjws`, and `vjwa` cover JWT claims, compact signatures,
and native cryptographic operations used by authentication consumers. `vjwks-rsa`
retrieves public signing keys for these consumers, including Firebase Admin.
`vhttps-proxy-agent` supplies HTTP CONNECT tunnels through HTTP/HTTPS proxies,
using `vagent-base` for connection lifecycle and pooling. The agent base also
supports the current agent-base 9 API and ESM proxy callers. `vgaxios` supplies
the current Google HTTP client API using native fetch for ordinary requests
and `vnode-fetch` for Node agents, proxies and client certificates. `vgtoken` exchanges service-account assertions for
access and ID tokens on this HTTP/signing stack. `vgoogle-logging-utils` supplies
diagnostic logging with structured output and optional event sinks. `vjson-bigint`
preserves exact JSON numbers without an arithmetic dependency. `vgcp-metadata`
supports the current metadata API with bounded requests, credential-safe diagnostics
and verified Google Auth 10/11 caller paths. `vgoogle-auth-library` supplies the
Google Auth 11 credential flows used by backend SDKs, with isolated JWT caches,
shared forced refreshes and stricter ID-token verification. `vretry-request`
provides cancellable callback and download-stream retries for current Cloud
Storage and google-gax callers, without external dependencies.
`vstream-events` supplies independent one-time read/write notifications for
these download streams, also without external dependencies.
`vuuid` provides UUID generation and parsing.
Two declaration-only packages provide Node and Undici types for development.

Integration tests serve pinned Firebase Functions consumers through the VPM
framework and compare behavior against Google Functions Framework. Firebase
Functions and the wider Firebase/Google SDK trees still contain upstream packages.
Application adoption and deployment are separate from these compatibility tests.

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
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/google-http-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
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
compiler checks use the supported CLI. VPM builds only with TypeScript 7; a
separate [TypeScript 5 gate](scripts/legacy-typescript/README.md) compiles the
public declarations with 5.8 and 5.9, which downstream applications still use.
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
npm --prefix scripts/google-http-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
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
outside the workspace and published package archives. The
[Functions Framework suite](scripts/framework-conformance/README.md) similarly
checks HTTP/event handling, module loading and logging on Node and Bun, and the
[router suite](scripts/router-conformance/README.md) runs router 2.2.0's own
tests against vrouter. The [JWT suite](scripts/jwt-conformance/README.md) and
[JWKS suite](scripts/jwks-conformance/README.md) cover token verification and
public-key retrieval, including independent middleware consumers. The
[Agent suite](scripts/agent-conformance/README.md) checks subclass connections
and native HTTP/TLS pooling alongside real proxy-client integration. The
[Google Auth suite](scripts/google-auth-conformance/README.md) checks the selected
current credential flows with upstream controls. The
[retry-request suite](scripts/retry-request-conformance/README.md) checks all
upstream cases, retry lifecycle regressions and current Google SDK callers.
The [stream-events suite](scripts/stream-events-conformance/README.md) verifies
stream notifications, lazy downloads and exact body delivery in those callers.

## License

Repository-owned code is MIT unless a package states otherwise. Derived packages
preserve their upstream licenses and copyright notices. Check each package's
LICENSE and metadata.
