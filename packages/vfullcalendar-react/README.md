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

The calendar retains 7.1.3 runtime code apart from the two package names,
the JSON feed request and the `setDates` correction below. The
[focused tests](test/react.test.cjs) check these exact differences against the
recorded hashes. The changes are:

- **Event edits preserve all-day status.** `setDates(start, end)` used to write
  `allDay: undefined` when the optional flag was omitted, including in upstream
  7.1.3. It now retains the current flag; explicit `true` and `false` still convert
  it. A mounted original/VPM control covers both timed and all-day events.
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
  interaction, list, classic theme) bundles to 281,307 bytes minified and 77,789
  gzipped instead of 301,385 and 84,399: the 19 polyfill modules are gone.

## Adopting the v7 API

VentiMath currently pins the separate 6.1.17 packages. Its calendar has not been
migrated by building this replacement. The application-shaped fixture confirms
navigation, month/week/day views, custom event content, click/selection payloads,
event edits, event-array filtering and unmount against the v7 API.

- Import plugins and public types from this package's subpaths/root. Use
  `CalendarRef` for the React ref, `DatesSetInfo`, `DateSelectInfo`,
  `EventClickInfo`, `EventAddInfo`, `EventChangeInfo`, `EventRemoveInfo` and
  `EventDropInfo` for callbacks, and `EventDisplayInfo` for custom content.
- Install a theme plugin and its explicit CSS, as shown above. The application's
  existing calendar CSS needs a browser review against v7 markup.
- Remove the v6 `getApi().updateSize()` call: v7 no longer exposes that method.
  Verify resizing when the app's sidebar changes in its actual browser layout.
- The app's custom agenda view is separate; it is not the FullCalendar list plugin.

The fixture does not mount the complete application or certify its pointer
selection, drag/resize persistence, styling or responsive layout. The retained
calendar rendering and interactions still need an independent implementation.

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
- [Application-shaped callers](../../scripts/fullcalendar-react-conformance/application.cjs):
  four mounted checks, including the omitted-`allDay` regression control.
- [Declarations](../../scripts/fullcalendar-react-conformance/types.cjs): an
  application compiles against them with DOM and React 19 types under
  the configured TypeScript 7 compiler.
- [Bundle size](bench/bundle.cjs), recorded in
  [bench/results/bundle.json](bench/results/bundle.json).

MIT licensing, the pinned source, the dependency map and the modified files are
recorded in [PROVENANCE.json](PROVENANCE.json).
