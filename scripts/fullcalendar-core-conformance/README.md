# FullCalendar core conformance

Baseline: **@fullcalendar/core 7.1.3**, the npm tarball recorded in the package
[provenance](../../packages/vfullcalendar-core/PROVENANCE.json), checked
November 1, 2026, with **@fullcalendar/react 7.1.3**, which bundles its own copy
of the JSON feed request. The release has no tests of its own, so the fixture
compares behavior directly.

```sh
npm --prefix scripts/fullcalendar-core-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/fullcalendar-core-conformance/callers.cjs
node scripts/fullcalendar-core-conformance/regressions.cjs
```

Repeat with Bun.

`callers.cjs` runs eleven `requestJson` calls (GET and POST, existing queries,
arrays, `undefined` and Unicode values, a 500 response, a body that is not
JSON) and a refused connection through the original, React's copy and VPM, each
in its own process, against a server that records every request. React's copy
must match the original exactly; VPM must match apart from three URLs, which are
asserted: a `#fragment` URL (the original sends no parameters), a call without
parameters (the original's URL ends in `?`, which Bun's fetch sends and Node's
drops) and a URL ending in `?` (the original adds `&`).

`regressions.cjs` reproduces each change with the original and checks it here:
the fragment URL's missing range parameters, declarations that fail to compile
without DOM types (TS2304 for `Response`) and compile with them, and the console
message printed on importing the entry.
