# FullCalendar React verification

The pinned control is **@fullcalendar/react 7.1.3**, commit
`6b890e803c66d1e6db2fb21c449936155b7e81fc`. `upstream/` retains attributed,
hash-verified tests and fixtures. The independently written VPM renderer covers
[VentiMath's documented calendar scope](../../packages/vfullcalendar-react/README.md).

```sh
npm --prefix scripts/fullcalendar-react-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/fullcalendar-react-conformance/react-suite.cjs --upstream
node scripts/fullcalendar-react-conformance/react-suite.cjs
node scripts/fullcalendar-react-conformance/application.cjs
node scripts/fullcalendar-react-conformance/regressions.cjs
node scripts/fullcalendar-react-conformance/types.cjs
node scripts/fullcalendar-react-conformance/application-browser.cjs
```

Repeat the mounted suites with Bun. Chromium checks use `CHROME_BIN` or a
standard Chrome/Chromium installation. `CALENDAR_SCREENSHOT` optionally saves
the checked week view.

- `react-suite.cjs --upstream`: all 27 unchanged upstream React tests, as a control.
- `react-suite.cjs`: 11 independent tests for the supported lifecycle, context,
  current callbacks, defensive event values/revert, dates, stale/rejected event
  sources, selection, safe text, imperative options and excluded views.
- `application.cjs`: six common app-shaped cases on both implementations,
  including an upstream failure control for omitted `allDay` edits.
  The event-identity cases preserve DOM nodes across filtered arrays and reproduce
  mount-driven label-state loops from VentiMath; both failed r2 and pass the patch.
- `regressions.cjs`: mounted Casablanca offset and fragment-safe JSON feed checks.
  Bun's native Temporal also handles the original timezone case correctly.
- `types.cjs`: strict TypeScript 7 consumers against both declarations.
- `application-browser.cjs`: real mouse selection/preview, clicks, event drag,
  revert and resize under StrictMode; multiday spans, overlapping event layout,
  overflow, month/week/day views, theme changes, mobile width and cleanup.

The browser harness represents the app's configuration; it is not the entire
application, a production deployment test, or exhaustive touch/accessibility
certification. The actual application's committed source was separately copied
to an isolated directory and its complete frontend TypeScript 7 check passed
with the three local VPM calendar packages substituted.

`browser-suite.cjs` / `browser-compare.cjs` retain the old broad suite for research
and the earlier fork's historical evidence. They depend on custom-view/plugin
internals outside the new scope and are not current VPM gates. CI uses the
application browser checks above. No old full-suite success is attributed to
the independent renderer.
