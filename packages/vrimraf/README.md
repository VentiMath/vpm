# vrimraf

An independently written filesystem cleanup package for VentiMath's build tools,
modeled on **rimraf 6.1.4**. The verified app caller is Capacitor 8.2.0's iOS
archive cleanup, which calls `rimraf.sync(path)`. Comparisons also cover the
app's installed rimraf 6.1.3 and the Google SDK dependency tree's 5.0.10.
A dependency-tree occurrence does not establish that a deployed SDK executes it.

```js
const {rimraf, rimrafSync} = require('vrimraf');
await rimraf('build');
rimrafSync(['cache', 'output']);
await rimraf('output/**/*.tmp', {glob: {cwd: projectDirectory}});
```

Node 24 and Bun are the runtime targets. This package is built and tested;
VentiMath adoption and a public release are separate steps.

## Behavior

- `rimraf(paths, options?)` returns `Promise<boolean>`; `rimrafSync` and `sync`
  return `boolean`. `rimraf.sync`, `rimraf.rimrafSync` and `rimraf.rimraf` are
  aliases. Missing paths succeed. A filter retaining an entry returns `false`.
- Paths are strings or arrays of strings. Globbing is **off by default**, so
  `file*` means that literal filename. Set `glob: true` or pass VPM glob options
  to enable matching. Glob `cwd`, ignore patterns and dotfile options are honored.
- Ordinary deletion uses the runtime's `fs.rm`/`fs.rmSync`. `vglob` is the sole
  package dependency and loads only when matching is requested.
- Filters and abort signals use an iterative postorder traversal. Children are
  processed before their directory's filter. Rejecting a directory does not
  prevent its children from being removed; rejecting a child keeps its ancestors.
- Async filters may return promises. Sync filters must return synchronously.
  Falsey filter results retain an entry. Filter metadata has the common file,
  directory and symlink predicates; complete native Stats fields are not promised.
- `signal`, `maxRetries` and `retryDelay` are supported. Cancellation is checked
  between operations and during async retry delays. It cannot undo earlier
  removals or interrupt an already running filesystem call. Sync work does not
  yield to timer-driven aborts.
- Terminal symlinks, including ones written with a trailing separator, are
  unlinked without traversing their targets. Input paths and intermediate path
  components must be trusted; this is not a filesystem sandbox.

## Deliberate changes

The whole input batch and expanded paths are validated before deletion starts.
Empty paths, null bytes and non-string entries are rejected. Filesystem roots
are always protected, including when `preserveRoot: false` is supplied.

Duplicate targets and children of selected parents are removed once. Independent
roots are processed sequentially. This avoids overlapping native removals that
can leave an empty directory behind under Bun. Filter callback order and the
number of calls for duplicate or overlapping targets are not upstream contracts.

During manual traversal, identity checks detect replacements observed between
filesystem operations, including a directory replaced by a symlink inside a
filter. They cannot make path-based filesystem operations atomic against an
adversarial concurrent process. Sync promise filters, invalid retry values and
unsupported Windows strategy options throw instead of silently changing behavior.

The named `native`, `manual`, `posix`, `windows` and `moveRemove` strategy exports,
legacy callbacks, interactive CLI and Windows move/remove fallbacks are outside
this verified scope. Do not use this as an unrestricted replacement for callers
that require them. The filesystem evidence is for macOS locally and Linux in CI;
Windows-specific permission recovery is not verified.

## Command line

The `rimraf` executable accepts paths, `--glob`/`--no-glob`,
`--verbose`/`--no-verbose`, `--max-retries=N`, `--retry-delay=N`, `--help`,
`--version`, and `--` before a filename beginning with `-`. Root protection
cannot be disabled. Unknown flags reject the invocation before any deletion.

The executable uses Node through its shebang. When invoking `bin.cjs` directly
with Bun, put `--` after the script to separate Bun's arguments; a second `--`
is needed when the application itself needs a literal-path separator.

## Evidence

[Conformance checks](../../scripts/rimraf-conformance/README.md) cover scratch
filesystems, unchanged Capacitor cleanup code, CLI behavior, fresh/frozen npm and
Bun archive installs, and TypeScript consumers. No device build, signing operation
or private application data is used by the checks.

[Benchmarks](bench/README.md) report cleanup workloads with balanced isolated
processes and identical-source controls. No end-to-end build speedup is claimed.
[Provenance](PROVENANCE.json) records the reference version and scope.
