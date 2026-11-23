# vis-docker

Independent Docker detection for VentiMath's build tools, targeting **is-docker
4.0.0**. It has no package dependencies and supports Node 24 and Bun 1.4.4.

```js
import isDocker from 'vis-docker';
if (isDocker()) {
  // Choose container-appropriate tooling.
}
```

CommonJS `require('vis-docker')` returns the same callable. The first call checks
`/.dockerenv`, then `/proc/self/cgroup` for `docker`, then
`/proc/self/mountinfo` for `/docker/containers/`, stopping at the first match.
Both positive and negative results are cached for the module lifetime; imports
alone do no filesystem probing. Unreadable evidence is treated as absent. The
`is-docker` and `vis-docker` commands print nothing and return status 0 when
detected, 2 otherwise.

The in-house implementation preserves current matching and probe order while
avoiding an exception for an ordinary missing marker. Its CommonJS entry works
with the app's unchanged `open` 8.4.2 and `is-wsl` 2.2.0 callers. Compared with the
app's `is-docker` 2.2.1, mountinfo detection is an intentional upgrade: Docker
under WSL with only mountinfo evidence takes the Linux opener, not PowerShell.

This is filesystem evidence, not proof of isolation. It does not detect every
container runtime, query Docker, or refresh when files change. Podman-only
markers are deliberately outside the is-docker API. Native WSL/Windows/Docker
execution is not claimed by the simulated caller checks.

[Verification](../../scripts/docker-conformance/README.md) covers upstream tests,
filesystem contracts, unchanged callers and fresh package installs. See
[measurements](bench/README.md) and [provenance](PROVENANCE.json). This source
package is built independently; public release and application adoption are
separate steps.
