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
  sources, selection, safe text, imperative options and excluded views. It also
  runs `transitions.cjs`: 17 shared exact-instant/rendering/default-duration
  tests against upstream/VPM,
  nine VPM pointer transition/duration/revert cases and a zero-movement case.
  The zero-movement preservation assertion is VPM-only: upstream loses DST fold
  metadata on that operation. All other instant assertions pass both controls.
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
  Text-bounds assertions cover the first visible hour in default 6am week/day
  scrolling, custom 9am scrolling and a non-midnight grid start. The r3 negative
  control clips the 6am text by about five pixels; the corrected stylesheet passes
  without changing scroll positions or slot geometry. Trusted pointers also
  cover both timed/all-day transitions, a mid-event grab, another target date,
  positive forced durations, visible event retention and revert. Repeated-hour
  ranges also have positive block bounds and exact trusted-click payloads in
  day/week and local/named Pacific zones. Ten mounted DST tests compare rendered
  nodes, forced/custom clock durations, explicit calendar units and all-day
  midnight boundaries with upstream; eight fail r4.

`CALENDAR_PACKAGES_DIR` selects an installed package directory for both the
mounted and browser harnesses. The release checker runs these cases against
the exact packed archives before publication and against fresh public URL
installs afterwards, with no internal dependency overrides.

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
