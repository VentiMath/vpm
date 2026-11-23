# Container and WSL controls

Pinned development fixtures cover is-inside-container 1.0.0, is-wsl 3.1.1, the
app's is-wsl 2.2.0 and open 8.4.2, and Docker 4 as an explicit comparison for
the newer mountinfo behavior. None of these upstream fixtures ships in a VPM
implementation.

```sh
npm --prefix scripts/container-conformance ci --ignore-scripts
node --test packages/vis-inside-container/test/*.test.cjs
node scripts/container-conformance/container.cjs
node scripts/container-conformance/archives.cjs
```

Run the tests and contracts with Bun as well. The archive gate installs the
entire VPM dependency closure using local tarballs and explicit local dependency overrides under the original entry
name, then verifies fresh and frozen npm/Bun installs, CJS/ESM, silent CLI
statuses and TypeScript 7 NodeNext/Bundler consumers.

The container contract checks 44 cases covering short-circuit order, both cache
values, missing/unreadable Podman evidence and the unchanged current WSL caller.
Four full-stack cases intentionally differ from the older Docker 3 closure:
mountinfo-only Docker evidence prevents WSL host classification. Current-control
comparisons with Docker 4 match. Only import/export declarations are adapted for
filesystem injection; upstream decision code is unmodified. These are simulated
OS checks, not tests running on native Windows/WSL or inside Docker/Podman.
