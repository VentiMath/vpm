# Docker detection conformance

Pinned controls are `is-docker` 4.0.0, the app's 2.2.1, `is-wsl` 2.2.0 and `open`
8.4.2. These are development fixtures only; vis-docker has no runtime package
dependencies.

```sh
npm --prefix scripts/docker-conformance ci --ignore-scripts
node --test packages/vis-docker/test/*.test.cjs
node scripts/docker-conformance/upstream.cjs
node scripts/docker-conformance/contract.cjs
node scripts/docker-conformance/callers.cjs
node scripts/docker-conformance/archives.cjs
```

Run the tests, contract and callers with Bun as well; run the upstream adapter
with `bun test ./scripts/docker-conformance/upstream.cjs`. The
archive gate itself checks both runtimes after fresh and frozen npm/Bun installs
under the original package name, both silent CLI aliases and TypeScript 7 with
NodeNext/Bundler resolution.

The five upstream tests are preserved byte-for-byte with their license and a
recorded hash. The adapter supplies VPM to their esmock calls; assertions remain
unchanged. The contract enumerates 224 filesystem scenarios with current-result,
probe-order and cache checks. Thirty-six mountinfo-only cases intentionally
improve on 2.2.1. The current control's import/export declarations alone are
adapted to CommonJS for deterministic filesystem injection.

Nine simulated OS contexts run the unchanged, hashed open and is-wsl sources
used beneath Capacitor. They compare selected commands and arguments, including
WSL release and proc-version checks and Docker marker/cgroup/mountinfo cases.
Subprocess spawning is intercepted: no application is opened, no Docker daemon
is accessed, and no native Windows/WSL execution is claimed. The actual app
dependency pins are not changed.
