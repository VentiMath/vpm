# vpath-scurry

Independent filesystem paths and traversal targeting path-scurry 3.0.0, verified
against VentiMath's glob 13.0.6 caller and its installed path-scurry 2.0.2 contract.
The runtime depends on VPM's `vlru-cache` and `vminipass`.

```js
import { PathScurry } from 'vpath-scurry';

const files = new PathScurry('./src');
for await (const entry of files) {
  if (entry.isFile()) console.log(entry.relative());
}
```

Path objects preserve identity within the bounded directory cache. Resolution
normalizes Unicode and optionally case, supports POSIX, Windows drives and UNC
paths, and promotes provisional names to real directory entries. Windows root
resolution follows version 3: `/` refers to the current drive, extended UNC
spellings share identity, and new roots retain the injected filesystem.

Directory reads coalesce concurrent requests. Explicit cached accessors expose
observations; `lstat()` and `lstatSync()` refresh metadata. Custom callback and
promise filesystem implementations are supported. Relative symlink targets
resolve against their canonical parent, including nested directory symlinks.

Walks, synchronous/asynchronous iterators and object streams support inclusion
filters, descent filters and optional symlink following with cycle protection.
Traversal uses an iterative queue. Streams stop producing when paused, resume
on demand, and stop filesystem work after destruction. Wide directories do not
spread their entries into the JavaScript argument stack.

`chdir()` clears cached resolution strings. This fixes a confirmed upstream
3.0.0 behavior where resolving a previously cached argument can return a path
under the old working directory. It retains the underlying path graph.

This completes the filesystem layer beneath glob; it does not replace glob's
embedded default bundle or change VentiMath's installed dependencies. The caller
fixture uses unchanged `glob/raw` and counts replacement constructions. There
is no public package release yet. Workspace consumers use the VPM dependencies;
archive validation pins those dependencies explicitly, including Bun overrides,
so no unclaimed names are resolved from npm.

Validation includes 14 focused tests, 59,256 differential assertions against
3.0.0 and 2.0.2, 278 unchanged glob caller checks, and fresh/frozen npm and Bun
archive installations with TS7 CJS/ESM consumers. On Node, 17 unchanged upstream
test groups pass with 1,723 assertions; three groups that mock upstream module
internals are excluded. Focused tests independently cover the relevant platform,
filesystem override, Dirent-type and error behaviors. This is not a claim that
the complete upstream test suite runs unchanged.

Directory caches are observations, not filesystem watchers. Permissions and
missing-path errors produce empty/undefined results as in the target API.
Traversal order beyond the tested contract is not a sorting guarantee. Internal
base-class construction and upstream private fields are not compatibility APIs.
The declarations use structural filesystem types without ambient Node/DOM
requirements. Native filesystem I/O requires Node 24 or Bun 1.4.4.

[Conformance](../../scripts/path-scurry-conformance/README.md),
[measurements](bench/README.md) and [provenance](PROVENANCE.json).
