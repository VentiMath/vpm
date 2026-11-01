# FullCalendar React conformance

Baseline: **@fullcalendar/react 7.1.3**, the npm tarball recorded in the package
[provenance](../../packages/vfullcalendar-react/PROVENANCE.json), checked
November 1, 2026. From the `v7.1.3` tag (commit
`6b890e803c66d1e6db2fb21c449936155b7e81fc`), `upstream/` retains the React
package's tests and vitest configuration, the browser suite
(`packages/vanilla-tests/src`), the plain JavaScript wrapper it runs against
in React mode (`packages/vanilla-w-react/src`), the five plugin packages the
suite imports, and the repository license. Files carry a `.txt` suffix and are
verified against `SHA256.json` before use. The fixture pins the original and the
test tools at the versions in the release's lockfile (React 19.2.4, Testing
Library 16.3.2, jsdom 27.4.0, vitest 4.0.18, Jasmine 3.99.1, jQuery 3.7.1 and the
plugins' Luxon, Moment, RRule and ical.js), with esbuild 0.19.12 and
playwright-core 1.63.0 to bundle and run the browser suite.

```sh
npm --prefix scripts/fullcalendar-react-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/fullcalendar-react-conformance/react-suite.cjs --upstream
node scripts/fullcalendar-react-conformance/react-suite.cjs
node scripts/fullcalendar-react-conformance/regressions.cjs
node scripts/fullcalendar-react-conformance/application.cjs
node scripts/fullcalendar-react-conformance/types.cjs
node scripts/fullcalendar-react-conformance/browser-compare.cjs
```

Repeat the first three with Bun. The browser suite needs a Chrome or Chromium
binary (`CHROME_PATH`, or a standard location).

`react-suite.cjs` runs the release's 27 React tests (jsdom, in UTC as upstream's
CI runs; one test builds dates from the current time) with the package
under test linked as `../dist`, as upstream's tests import it, and one React for
tests and calendar. All 27 pass for both libraries. One test calls
`vi.resetModules()` and re-imports the package; in upstream's repository the
package is its own build, which vitest processes, so the installed original is
inlined the same way.

`browser-suite.cjs` runs FullCalendar's browser suite the way upstream runs it
against the React build (`FORCE_REACT=1`, which maps `fullcalendar` to
`fullcalendar-w-react`): the wrapper is built from its sources on the library
under test, the suite's 248 files and plugins are bundled with esbuild (with
upstream's injection of the suite's global helpers), and Jasmine runs them in
headless Chromium after the jQuery, jasmine-jquery, jquery-simulate and jQuery UI
scripts upstream's Karma configuration loads, at its 1280x1696 window, in a
fixed order, in `America/Phoenix` (a non-UTC offset, which the suite's local
time zone specs need, without daylight saving changes that shift specs built
from the current date), with Google Calendar's live-API tests skipped as upstream's CI
does (`--no-gcal`). `browser-compare.cjs` runs it for both libraries and requires
the same status for each of the 1,542 specs. Five fail for both in this
configuration and are pinned by name: four `destroy` specs count React's 137
delegated listeners on the calendar's container against a baseline measured with
Preact's `createRoot` (the suite's `lib/vdom-misc` imports Preact directly), and
one scroll spec trips Chromium's "ResizeObserver loop completed" error.

One timing adaptation is applied only to the temporary compiled input, after
verifying the retained upstream sources. The promise-like event-source test
originally resolved a jQuery Deferred at 100 ms and checked the calendar at
101 ms, racing jQuery's additional callback timer. Both implementations now
run the same event-count assertion after a nonempty `eventsSet` callback, with the existing
Jasmine timeout. The comparison also prints every failed assertion so CI
reports retain the reason for any new failure.

`regressions.cjs` mounts a calendar with each library under vitest and jsdom
and observes the two fixes that come from the packages below it: a
`timeZone: 'Africa/Casablanca'` calendar during Ramadan 2020 (where the runtime
has no native Temporal, the original shows a 15:00 UTC event at 16:00 +01:00),
and a JSON feed URL with a `#fragment` (the original sends the range after the
fragment).

`types.cjs` compiles a React component using the calendar, plugins, a locale and
the option, callback and error types against each library's declarations, with
DOM and React 19 types, under the configured TypeScript 7 compiler.

`application.cjs` runs four mounted, app-shaped cases against both implementations
on Node/Bun: navigation, month/week/day views, custom event content, click and
selection callbacks, edit payloads, filtering and unmount. A separate assertion
reproduces upstream clearing `allDay` when `setDates` omits that option; VPM must
preserve the boolean and accept explicit conversions. Both v7 APIs lack the
v6 `updateSize` method. The TypeScript consumer covers the v7 callback/ref types
and checks that removal. These probes represent the calendar configuration used
by VentiMath; they do not mount the app, exercise pointer dragging or verify its
custom CSS. The app still pins v6.1.17 and migration is separate work.
