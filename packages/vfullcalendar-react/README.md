# vfullcalendar-react

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Its tests verify that adapted build.
An independently written implementation of the application-facing APIs is
pending; this package is not yet a completed rewrite.

FullCalendar 7 for React, targeting **@fullcalendar/react 7.1.3**, the latest
stable release checked November 1, 2026. Its dates and time zones come from
[`vfull-ui-headless-calendar`](../vfull-ui-headless-calendar/README.md) and its
JSON feed request from [`vfullcalendar-core`](../vfullcalendar-core/README.md);
`temporal-polyfill` is not needed. React and react-dom 17-19 are peers. An ES
module package for browsers.

```jsx
import FullCalendar from 'vfullcalendar-react';
import dayGridPlugin from 'vfullcalendar-react/daygrid';
import timeGridPlugin from 'vfullcalendar-react/timegrid';
import interactionPlugin from 'vfullcalendar-react/interaction';
import classicThemePlugin from 'vfullcalendar-react/themes/classic';
import 'vfullcalendar-react/skeleton.css';
import 'vfullcalendar-react/themes/classic/theme.css';
import 'vfullcalendar-react/themes/classic/palette.css';

export function Schedule({ onPick }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]}
      initialView="timeGridWeek"
      events={{ url: '/api/events' }}
      editable
      eventClick={(info) => onPick(info.event)}
    />
  );
}
```

This is 7.1.3's published build: the calendar component and
`useCalendarController`, the day grid, time grid, interaction, list and
multi-month plugins, the classic, monarch, forma, breezy and pulse themes, 81
locales, and the public and protected APIs, with the same exports, CSS and
declarations. In FullCalendar 7 the plugins are subpaths of this package; the
v6 packages (`@fullcalendar/core` as the calendar, `@fullcalendar/daygrid`,
`@fullcalendar/interaction` and so on) are not used with it.

| Upstream dependency | Here |
| --- | --- |
| `@full-ui/headless-calendar` 7.1.3 | `vfull-ui-headless-calendar` |
| `@fullcalendar/core` 7.1.3 (types) | `vfullcalendar-core` |
| `temporal-polyfill` ^1.0.1 (peer) | Not needed: time zones are read through `Intl` |

## Changes from 7.1.3

The calendar's own code is unchanged: every file is byte-identical to 7.1.3
apart from the two package names and the JSON feed request, which the
[focused tests](test/react.test.cjs) check against the recorded hashes. The
changes come from the packages below it:

- **Named time zones.** A calendar with a `timeZone` such as
  `'Africa/Casablanca'` converts times through `vfull-ui-headless-calendar`.
  Where a browser has no native `Temporal` (the iOS 15 WebView, older
  browsers), the original's polyfill has wrong offsets in 29 zones: a mounted
  Casablanca calendar shows a 15:00 UTC event at 16:00 during Ramadan 2020,
  when Morocco was on GMT. The engine's other fixes (years 0-99, offsets never
  printed as ":60", local-time milliseconds) apply too. Calendars in the
  default `'local'` zone, or `'UTC'`, never used the polyfill.
- **JSON feeds with a `#fragment`.** The bundled request appended the range
  parameters after the fragment, which fetch never sends, so a feed at
  `/api/events.php#calendar` received no `start`, `end` or `timeZone`. The
  request is now `vfullcalendar-core`'s, which puts them ahead of the fragment.
  `JsonRequestError` is the class `vfullcalendar-core` exports.
- **Smaller bundles.** A typical application (calendar, day and time grids,
  interaction, list, classic theme) bundles to 283,220 bytes minified and 77,697
  gzipped instead of 301,385 and 84,399: the 19 polyfill modules are gone.

## Evidence

- [React suite](../../scripts/fullcalendar-react-conformance/README.md): the
  release's 27 React tests (vitest, jsdom) pass for both libraries on Node and
  Bun.
- [Browser suite](../../scripts/fullcalendar-react-conformance/browser-compare.cjs):
  FullCalendar's 1,542-spec browser suite, run as upstream runs it against the
  React build in headless Chromium, gives identical results for the original and
  VPM, spec by spec.
- [Regressions](../../scripts/fullcalendar-react-conformance/regressions.cjs):
  the time zone and JSON feed cases observed through a mounted calendar.
- [Declarations](../../scripts/fullcalendar-react-conformance/types.cjs): an
  application compiles against them with DOM and React 19 types under
  the configured TypeScript 7 compiler.
- [Bundle size](bench/bundle.cjs), recorded in
  [bench/results/bundle.json](bench/results/bundle.json).

MIT licensing, the pinned source, the dependency map and the modified files are
recorded in [PROVENANCE.json](PROVENANCE.json).
