# vis-inside-container

Independent Docker/Podman detection targeting **is-inside-container 1.0.0** for
VentiMath's build tools. Node 24 and Bun 1.4.4 are supported. Its only package
dependency is the in-house [vis-docker](../vis-docker).

```js
import isInsideContainer from 'vis-inside-container';
const inside = isInsideContainer();
```

CommonJS returns the same callable. Imports alone do not probe the filesystem.
The first call checks `/run/.containerenv`; absent or unreadable evidence falls
through to vis-docker. Positive and negative results are cached for the module
lifetime. The `is-inside-container` and `vis-inside-container` commands are silent
and exit with 0 when detected, 2 otherwise.

The implementation uses a nonthrowing stat for an ordinary missing marker and
inherits Docker 4's mountinfo check. Upstream's Docker 3 dependency misses that
case. The unchanged current WSL caller is tested with both dependency versions,
including the intentional mountinfo-only improvement. Filesystem evidence is
heuristic: this does not detect every container runtime or prove isolation.

See [verification](../../scripts/container-conformance/README.md),
[benchmarks](bench/README.md) and [provenance](PROVENANCE.json). Platform checks
use deterministic simulations; native Podman/Docker/WSL execution, release and
VentiMath adoption are separate.
