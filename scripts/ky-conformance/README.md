# Ky conformance

Pinned controls are Ky 2.2.0 and the application's Ky 1.8.1. Public documentation
and declarations informed the independent implementation. The controls remain
fixture-only, with full distribution hashes in [provenance.json](provenance.json).
No upstream runtime is packaged in vky.

- `run.mjs`: 24 current and 20 application public-API snapshots, including request
  preparation, hook order, error data, JSON mutations and raw statuses.
- `matrix.mjs`: 160 query/header and retry-status/method combinations, compared
  exactly against each pinned control.
- `wire.mjs`: 22 native HTTP scenarios against a local server, including redirects,
  multipart uploads, replayed PUT bodies, HTTP errors, timeouts and cancellation.
  Four additional VPM checks exercise body deadlines and caller abort after headers.
- `browser.cjs`: bundles the same public API and native HTTP cases and compares
  upstream/VPM in real Chrome. No live app account or backend is used.
- `types.cjs`: strict TypeScript 7 ESM/CJS NodeNext and Bundler consumers, including
  negative checks for APIs not advertised.
- `archives.cjs`: exact local tarball, isolated npm/Bun installs, frozen reinstall,
  CJS/ESM class identity, both public entry points, unit tests and installed types.
- Package unit tests separately cover timeout/abort ownership, infinite backoff,
  all input/default/call signals, body size/cancellation, configuration validation,
  hook responses, query layers and API entry boundaries. Follow-up tests ensure a
  body timeout aborts the transport too, timed-out attempts cannot poison retries,
  hook-produced bodies stay bounded, and asynchronous JSON parsers respect abort.

Only generated wire fields such as Content-Length are omitted from synthetic
request snapshots. Runtime-specific Fetch defaults are compared within the same
runtime. API errors are compared semantically; message wording is not normalized
into a claim of exact wording compatibility. No private app source or credentials
are stored in these fixtures.

```sh
npm --prefix scripts/ky-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/ky-conformance/check-controls.cjs
node --test packages/vky/test/index.test.cjs
bun test packages/vky/test/index.test.cjs
node scripts/ky-conformance/run.mjs
bun scripts/ky-conformance/run.mjs
node scripts/ky-conformance/matrix.mjs
bun scripts/ky-conformance/matrix.mjs
node scripts/ky-conformance/wire.mjs
bun scripts/ky-conformance/wire.mjs
node scripts/ky-conformance/browser.cjs
node scripts/ky-conformance/types.cjs
node scripts/ky-conformance/archives.cjs
```

[Measurements](../../packages/vky/bench/results/README.md) use the process-isolated
AB/BA harness and identical-source controls. React is unrelated to this package;
VPM's current React integration baseline remains 19.3.

Performance recordings use Bun 1.4.4 or newer, matching the CI baseline. The
initial Bun 1.4.0 recording exercised a substantially more expensive stream
reader path. Its numbers remain in repository history, not relabeled as current
runtime evidence. The benchmark driver rejects older Bun versions. The
[previous-implementation comparison](../../packages/vky/bench/previous/README.md)
runs both VPM versions on the same Bun version and reconstructs the old source
from commit `552f1a3`; no old runtime copy is committed.
