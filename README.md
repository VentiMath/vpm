# Venti Package Manager

Venti Package Manager (VPM) is rebuilding the JavaScript package ecosystem with
clearer code, deliberate dependencies, stronger correctness, and measured
performance—from small utilities to the libraries behind full applications.

Packages retain recognizable names and APIs where they serve users well.
Implementations and interfaces can change when a better design warrants it.
Work follows the dependencies used by real backend and frontend applications,
with current upstream releases guiding compatibility.

Every replacement should explain its purpose, justify its dependencies, and
make its improvements verifiable:

- Tests cover normal use, edge cases, and the callers that depend on it.
- Benchmarks report gains and regressions against a named upstream version.
- Documentation states fixes, intentional differences, and compatibility limits.
- Types, source provenance, and licenses ship with the package.

The collection uses standard JavaScript package metadata and module exports.
The broader goal is an ecosystem that earns native support from package tooling,
including `bun install`, through demonstrated quality and practical adoption.

[Browse packages](packages/) ·
[Improvements and evidence](IMPROVEMENTS.md) ·
[Development guide](docs/DEVELOPMENT.md)

Repository-owned code is MIT unless a package states otherwise. Derived packages
retain their upstream licenses and attribution.
