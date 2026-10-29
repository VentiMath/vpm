# vgoogle-logging-utils

Dependency-free Google SDK diagnostic logging, compatible with the public
logging API of google-logging-utils 2.1.1, with retained 0.0.2 consumer coverage.

```js
const logging = require('vgoogle-logging-utils');
// Optional: set GOOGLE_SDK_NODE_LOGGING to filter namespaces, e.g. "gcp*".
// Selecting a backend explicitly also enables logging without that variable.
logging.setBackend(logging.getStructuredBackend());
const log = logging.log('gcp metadata');
log.info('metadata request completed');
log.on('log', (fields, args) => { /* optional event sink */ }).debug('ready');
```

## Changes

- The default structured backend writes a standalone JSON object per line,
  on stdout, matching the current upstream default, without a PID/text prefix.
  The formatted message and default severity remain authoritative. This is suitable for [Google's structured log ingestion](https://docs.cloud.google.com/logging/docs/structured-logging).
- Structured wrappers accept the advertised `{log, setFilters}` backend interface.
  They pass filter snapshots through that interface instead of relying on private
  `makeLogger()` methods.
- Replacing the backend preserves cached logger identity and attached event sinks.
  `.on()` returns the callable, so method chaining matches its declarations.
- Disabled placeholders are inert, including their shared event emitter. A listener
  attached to one disabled logger cannot observe another caller's messages.
- Backend and event-sink failures do not escape or print diagnostic data. Each tap
  runs independently, including once-only taps. Invalid configuration still throws.
- Namespace filters are case-insensitive, comma-separated wildcard patterns. Other
  characters are literal. Explicit `setFilters()` replaces a copied, frozen list
  and invalidates cached decisions. Matching uses string spans instead of generated
  regular expressions.
- The debug adapter calls the supplied factory's `enable()` method. It preserves
  the factory's initial filters and leaves `NODE_DEBUG` alone. No debug package is
  installed by this package; callers may supply `vdebug` or a compatible factory.

## API and lifecycle

Exports: `log`, `setBackend`, `getNodeBackend`, `getStructuredBackend`,
`getDebugBackend`, `AdhocDebugLogger`, `DebugLogBackendBase`, `LogSeverity`,
`placeholder`, and `env`. Loggers support calls with fields, severity methods,
subloggers, `.instance` and `.on('log', listener)`.

`GOOGLE_SDK_NODE_LOGGING` enables lazy selection of the default Node backend;
`all` and `true` both mean `*`. With no selected backend and an unset/empty flag,
`log()` returns the placeholder. An explicitly selected backend enables logger
creation even without the flag. Once selected, the backend remains active until
reset or replaced. Backends snapshot environment filters at construction; use
`setFilters()` to change those snapshots. `setBackend(null)` disables backend
output; existing explicit event taps still receive calls. `setBackend(undefined)` restores lazy selection of
the Node backend, gated by the current environment flag for new lookups. Existing
logger references and their event taps remain usable. Logger identities are
retained for the process lifetime.

Library-created severity fields and filter snapshots are immutable. Caller-supplied
fields remain caller-owned. Plain Node output preserves the familiar PID,
namespace/severity prefix and terminal colors. Structured output uses standard
JSON serialization; cyclic or bigint metadata drops that record without printing
its contents. Supply JSON-compatible fields. The upstream internal Temporal helper
is outside this package's exported API.

## Compatibility changes from the initial VPM version

Default structured output now writes to stdout; ordinary Node output still uses
stderr. Selecting a backend explicitly now enables it without an environment flag.
These changes follow upstream 2.1.1 rather than retaining 0.0.2 behavior. Explicit
`setBackend(null)` still disables output. Structured namespace filtering, safe
field handling, stable identities and independent event taps remain VPM improvements.

## Verification

20 focused tests cover structured output, custom sinks, identity, chaining,
disabled isolation, filter replacement, debug integration and failure containment.
All 17 entries from the 2.1.1 public upstream suite run unchanged on Node and Bun.
The ten 0.0.2 entries also run, with one VPM expectation updated for explicit backend
activation. Each suite includes an empty backend-replacement entry; focused tests
cover that behavior. Published upstream controls pass their original assertions.
The integration gate exercises the installed alias and a custom structured sink. Public types compile without Node or DOM declarations;
packed packages are checked through npm/Bun installation and CJS/ESM consumers.

```sh
node --test packages/vgoogle-logging-utils/test/*.test.cjs
bun test packages/vgoogle-logging-utils/test/logging.test.cjs
node scripts/google-http-conformance/logging.cjs
bun scripts/google-http-conformance/logging.cjs
node packages/vgoogle-logging-utils/bench/summarize.cjs --verify-current
```

[Benchmark evidence](bench/results/README.md) includes raw samples and controls.
Node.js 20+ and Bun; Apache-2.0. [Provenance](PROVENANCE.json) records the source
commits, the older conformance archive, and the exact current upstream test source.
