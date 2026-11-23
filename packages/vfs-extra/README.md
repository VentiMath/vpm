# vfs-extra

Independent filesystem conveniences targeting **fs-extra 11.4.1**, with the
11.3.4 and 9.1.0 contracts used by VentiMath's Capacitor/Ionic build tools checked
separately. The only package dependency is **vjsonfile 6.2.1**, also implemented
in VPM. Node 24 and Bun are the supported runtimes.

```js
import fs from 'vfs-extra';

await fs.copy('dist', 'native/public');
await fs.outputJSON('native/config.json', { appId: 'example.app' }, { spaces: '\t' });
await fs.move('temporary/Package.swift', 'ios/Package.swift');
```

The package provides callback, Promise and synchronous forms of `copy`, `move`,
`remove`, `emptyDir`, `ensureDir`, `ensureFile`, `ensureLink`, `ensureSymlink`,
`outputFile`, JSON reading/writing/output, and their fs-extra aliases. `pathExists`
returns a boolean. The root entry also exposes native filesystem operations,
with Promise support for the callback APIs. `open()` resolves a numeric file
descriptor; `read`, `write`, `readv` and `writev` retain their multiple results.
The `vfs-extra/esm` entry exposes only the convenience APIs, like upstream.

Copy supports overwrite/clobber control, `errorOnExist`, filtering, source link
dereferencing, file timestamps and modes. Relative and broken symlink targets
remain literal. Move first attempts native rename; on `EXDEV`, it copies before
removing the source. A failed fallback copy leaves the source in place.

A shared operation traversal drives the synchronous and asynchronous APIs.
Native filesystem primitives perform the I/O; VPM supplies the traversal,
parent creation, validation, callback/Promise adaptation and JSON integration.
There is no copied fs-extra, graceful-fs or universalify implementation in the
runtime, and no process-wide filesystem patch or descriptor-exhaustion queue.

Intentional boundaries and differences:

- Overlapping directory-tree copies and moves reject, including aliases through
  symlinked parents. Upstream permits some ancestor-directory merges.
- `remove`, `emptyDir` and `move` reject filesystem roots. Native exports such as
  `rm` retain their native contract.
- Copy does not merge a directory into an existing destination symlink. File
  replacement unlinks a destination symlink rather than modifying its target.
  Symlink overwrite flags are honored consistently.
- Special devices, FIFOs and sockets are outside the asset-copy contract.
- Synchronous Promise-returning filters reject explicitly. Copy rechecks the
  source after a filter runs, and caller-owned option objects are not mutated.
- `emptyDir` resolves `undefined`; incidental upstream arrays or created-path
  return values are not reproduced. Directory-creation helpers still return the
  first created directory when the native API supplies one.
- Errors preserve native codes where applicable; custom validation wording can
  differ. The JSON behavior and differences are documented in [vjsonfile](../vjsonfile).

These are pathname-based operations, not an atomic filesystem transaction or a
sandbox against concurrent filesystem mutation. Native filesystem and permission
behavior remains relevant. Real cross-device mounts and Windows filesystem
acceptance are not covered by the local evidence; the fallback is tested by
injecting `EXDEV` and copy failures.

[Conformance checks](../../scripts/fs-extra-conformance/README.md) exercise the
unchanged Capacitor asset-copy, config, Swift setup and cleanup callers, selected
upstream tests, differential filesystem states and fresh npm/Bun archives.
[Measurements](bench/README.md) include complete copy/cleanup workloads and raw
controls, without claiming a faster end-to-end build.

Built and verified in source. A public release and VentiMath adoption are
separate steps; application dependencies have not been changed here.
