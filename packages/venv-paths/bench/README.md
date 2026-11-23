# Directory selection measurements

Compare independent venv-paths with env-paths 4.0.0, including the current
filename validation. No filesystem operations are timed. Each operation returns
and retains a fresh object. The installed 2.2.1 caller is a compatibility control,
not the performance baseline, since it omits validation.

The shared isolated-process harness uses four balanced AB/BA pairs and two
identical-upstream control pairs, with twelve samples per process. Node 24 and
Bun are measured separately. Source hashes, process medians, raw samples and
controls are in [node.json](node.json) and [bun.json](bun.json).

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Capacitor directories | 1639 → 1421 ns | 1079 → 860 ns |
| default suffix | 1742 → 1543 ns | 1199 → 894 ns |
| Unicode and custom suffix | 2344 → 2081 ns | 1610 → 1359 ns |

All measured cases take less time in each pair beyond the control spread. The
Capacitor case has median paired reductions of about 13% on Node and 20% on Bun;
the Bun pair range is wide (8–64%), so that percentage is not a precise speedup
estimate. Stable OS defaults are prepared once; environment overrides remain
live and returned objects are not cached.

These sub-microsecond savings do not establish a faster Capacitor build. Its
ENV_PATHS constant is initialized once. Removing the package dependency and
owning the implementation are the main benefits.

```sh
OUTPUT=packages/venv-paths/bench/node.json node packages/venv-paths/bench/compare.cjs
OUTPUT=packages/venv-paths/bench/bun.json bun packages/venv-paths/bench/compare.cjs
```
