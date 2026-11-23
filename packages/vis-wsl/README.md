# vis-wsl

Independent Windows Subsystem for Linux detection targeting **is-wsl 3.1.1**
and the app's installed 2.2.0 caller. Supports Node 24 and Bun 1.4.4. The only
direct dependency is [vis-inside-container](../vis-inside-container), backed by
vis-docker; the runtime dependency closure is entirely VPM.

```js
import isWsl from 'vis-wsl';
if (isWsl) {
  // Choose WSL host tooling.
}
```

The public export is a **boolean computed at import**, including with CommonJS
`require('vis-wsl')`. It is not a detector function. Non-Linux platforms return
false without probing Linux paths. On Linux, detection checks the kernel release
and `/proc/version` for Microsoft, then the WSLInterop or `/run/WSL` markers for
custom kernels. Docker/Podman processes are excluded through the VPM container
helper. Missing or unreadable proc-version data still allows path detection.

Compared with the app's older version, custom-kernel detection and Podman
exclusion are deliberate upgrades to current behavior. Docker mountinfo-only
evidence is another upgrade inherited from vis-docker 4.0.0. The unchanged open
8.4.2 caller is checked against current and old controls, including the resulting
PowerShell versus Linux-opener choices. All launches are intercepted.

The upstream private `__IS_WSL_TEST__` environment hook is retained for test
compatibility; it exports a detector instead of a boolean and is not part of the
public declaration. Detection is a heuristic for tooling, not proof of isolation.
No environment variables are changed and no command is launched by this package.

[Verification](../../scripts/container-conformance/README.md),
[benchmarks](bench/README.md) and [provenance](PROVENANCE.json) record the scope.
Native Windows/WSL execution, publication and app adoption remain separate.
