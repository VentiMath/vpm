# vdebug

Namespace-based debug logging for Node.js 20+, Bun, and modern browsers. A
counterpart to `debug` 4.4.3 with compiled namespace filters, monotonic elapsed
timing, and bundled TypeScript declarations. Its only external runtime dependency
is VPM's [`vms`](../vms).

## Use

```js
const debug = require('vdebug');
const log = debug('app:http');

debug.enable('app:*,-app:secret');
log('listening on port %d', 3000);
log.extend('request')('received %s', '/items');
```

ES modules can use `import debug from 'vdebug'`. Node and Bun also read `DEBUG`
at initialization. Browser bundlers select the browser entry through the
`browser` condition or field; `vdebug/browser` explicitly selects it.

## API

- `debug(namespace)` creates a logger. Its namespace must be a string.
- `debug.enable(patterns)` replaces the current filters; comma or whitespace
  separates patterns, `*` matches any substring, and a leading `-` excludes a
  pattern. Exclusions win. Other punctuation is literal. No argument clears them.
- `debug.disable()` clears filters and returns the previous normalized pattern
  string, suitable for restoring with `enable()`.
- `debug.enabled(namespace)` checks a name without creating a logger.
- `log.enabled` reads the cached result. Assign `true` or `false` to override it,
  or `null` to resume namespace filtering.
- `log.extend(suffix, delimiter = ':')` creates a child and inherits a custom sink.
- Assign `log.log` for one logger, or `debug.log` for the factory, to replace its
  output function. Hooks receive the same formatted argument conventions as
  upstream and run with the logger as `this`.
- Add a one-letter handler to `debug.formatters` for custom `%` formatting. Node
  retains `%o` / `%O` inspection and its standard formatting; browsers retain `%j`.
- `debug.humanize` is `vms`. `debug.debug` and `debug.default` are factory aliases.
- `log.namespace`, `useColors`, `color`, and Node's `inspectOpts` remain available.
  Changing `namespace` refreshes enablement; its initially chosen color stays put.

`log.diff` is the rounded elapsed milliseconds between emitted messages from that
logger, measured by `performance.now()`. The first difference is zero. `log.curr`
and `log.prev` remain wall-clock millisecond timestamps. Disabled calls do not
coerce arguments, run formatters, read clocks, or write output.

The upstream `destroy()` compatibility stub is retained and does not disable a
logger. Use `enabled = false` or namespace configuration for that purpose.

## Node and browser behavior

Node writes through `util.formatWithOptions()` to stderr. `DEBUG_COLORS`,
`DEBUG_HIDE_DATE`, `DEBUG_DEPTH`, and other upstream `DEBUG_*` inspection options
remain supported. Colors default to the stderr TTY status. Basic ANSI colors are
always available; the extended palette is selected when
`process.stderr.hasColors(256)` reports support. Non-TTY streams without that
method use the basic palette when colors are explicitly enabled.

There is no optional `supports-color` lookup. That package detects terminal color
capabilities; upstream tries loading it even though it is not a declared runtime
dependency. Removing the lookup makes palette selection independent of incidental
packages elsewhere in the installation. Capability detection may choose different
colors from upstream; it does not change which namespaces are enabled.

The browser adapter retains console/CSS formatting, localStorage persistence
under `debug`, and tolerance of unavailable storage. It requires the modern
`performance.now()` API. Browser behavior is tested with controlled console,
storage, and browser globals; these tests are not a cross-browser visual test.

## Improvements and intentional differences

- Wildcard filters are compiled into literal chunks on `enable()`, reducing work
  during matching and avoiding repeated character-by-character prefix backtracking.
- `names`, `skips`, and `namespaces` are readonly snapshots. Update filters through
  `enable()`; direct mutation can no longer leave cached loggers out of sync.
- Elapsed durations do not jump backwards when the wall clock changes.
- Logger namespace changes refresh cached enablement.
- Invalid namespace/configuration types, non-string extension arguments, and
  enabled overrides other than boolean/null receive explicit `TypeError`s.
- Native terminal detection replaces the optional `supports-color` peer probe.
- Type declarations require no separate Node.js or debug types package.

Private `debug/src/*` import paths are not supported. Public logging, wildcard,
formatting, sink, and extension APIs remain recognizable. Filter compilation
allocates work at configuration time; no memory reduction is claimed.

## Validation and performance

Tests compare wildcard results with unchanged `debug` 4.4.3 across exhaustive
short patterns and 2,000 generated Unicode/punctuation configurations. They also
cover cache invalidation, immutable snapshots, overrides, custom formatters,
clock changes, Node output, color capabilities, and browser storage/console paths.
The repository's [integration gate](../../scripts/integration.cjs) aliases this
package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2,
firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs
real HTTP checks on Node and Bun in CI. It enables `DEBUG` for Express, router, `send`,
`body-parser`, and `finalhandler` and checks that each namespace's output arrives
through this package. Upstream fixtures are excluded from package archives.

From the repository root:

```sh
node packages/vdebug/bench/compare.cjs
bun packages/vdebug/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **debug / vdebug**, median nanoseconds
per call across seven samples of 50,000 calls after warmup. Inputs vary, results
are consumed, and implementation order alternates.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Prefix wildcard | 56 / 22 | 39 / 24 |
| Middle wildcard | 91 / 42 | 71 / 36 |
| Excluded namespace | 100 / 27 | 128 / 22 |
| Repeated-prefix failure | 3,815 / 462 | 2,476 / 46 |
| Cached disabled call | 9 / 9 | 51 / 61 |
| Enabled call, no I/O | 407 / 418 | 263 / 256 |
| Configure ten patterns | 472 / 1,708 | 499 / 2,797 |

Namespace matching improved in these cases, particularly repeated-prefix misses.
**Configuration became slower** because it compiles filters. Cached disabled
calls and enabled-call processing were close on Node; the disabled Bun case was
slower. Enabled-call measurements use the shared core with a minimal formatting
adapter and sink, excluding terminal formatting and I/O. These results do not
establish application throughput, startup, or terminal-writing improvements and
vary across runs and runtimes.

## Install from this repository

Create archives in both `packages/vms` and `packages/vdebug` with `bun pm pack`.
In the consuming project's `package.json`:

```json
{
  "dependencies": {
    "vdebug": "file:/absolute/path/to/vpm/packages/vdebug/vdebug-0.1.0.tgz"
  },
  "overrides": {
    "vms": "file:/absolute/path/to/vpm/packages/vms/vms-0.1.0.tgz"
  }
}
```

Run `bun install`. Packing converts the workspace dependency to the matching
`vms` version; the override supplies its local archive. These packages have not
been published by VPM to a registry.

## Origin and license

Derived from [`debug` 4.4.3](https://github.com/debug-js/debug/tree/6b2c5fbdb7d414483d9e306ef234acb4cd7ea67c),
by TJ Holowaychuk and Josh Junon. Upstream source fixtures are verified against
that commit. MIT licensed; notices are preserved in [LICENSE](LICENSE), including
separate notices for the test-only upstream `ms` fixture.
