# vgoogle-logging-utils

Dependency-free Google SDK diagnostic logging, compatible with the public
logging API of google-logging-utils 0.0.2.

```js
const logging = require('vgoogle-logging-utils');
// Set GOOGLE_SDK_NODE_LOGGING before creating loggers, for example "gcp*".
logging.setBackend(logging.getStructuredBackend());
const log = logging.log('gcp metadata');
log.info('metadata request completed');
log.on('log', (fields, args) => { /* optional event sink */ }).debug('ready');
```

## Changes

- The default structured backend writes a standalone JSON object per line,
  without a PID/text prefix. The formatted message and default severity remain
  authoritative. This is suitable for [Google's structured log ingestion](https://docs.cloud.google.com/logging/docs/structured-logging).
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

`GOOGLE_SDK_NODE_LOGGING` gates logger creation. An unset/empty value returns the
placeholder; `all` enables every namespace. Backends snapshot the environment's
filters at construction. Existing loggers retain their creation behavior until the
backend is changed. `setBackend(null)` disables backend output; existing explicit
event taps still receive calls. `setBackend(undefined)` restores lazy selection of
the Node backend. Logger identities are retained for the process lifetime.

Library-created severity fields and filter snapshots are immutable. Caller-supplied
fields remain caller-owned. Plain Node output preserves the familiar PID,
namespace/severity prefix and terminal colors. Structured output uses standard
JSON serialization; cyclic or bigint metadata drops that record without printing
its contents. Supply JSON-compatible fields. The upstream internal Temporal helper
is outside this package's exported API.

## Verification

16 focused tests cover structured output, custom sinks, identity, chaining,
disabled isolation, filter replacement, debug integration and failure containment.
All ten public upstream suite entries run unchanged on Node and Bun (one upstream
entry contains no assertions). The integration gate exercises the installed alias
and a custom structured sink. Public types compile without Node or DOM declarations;
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
commit and immutable conformance archive.
