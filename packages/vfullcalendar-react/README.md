# vfullcalendar-react

An independently written React calendar for the FullCalendar **7.1.3** APIs
VentiMath uses. It provides month, week and day views, navigation, custom React
event content, selection, event dragging/resizing, and the classic theme hooks.

The renderer, event model, styles and declarations are new implementations.
The previous copied renderer chunks and unused theme/plugin bundles no longer
ship. Dates and time zones come from `vfull-ui-headless-calendar`; JSON feeds
use `vfullcalendar-core`. React and React DOM remain peers.

```tsx
import Calendar from 'vfullcalendar-react';
import dayGrid from 'vfullcalendar-react/daygrid';
import timeGrid from 'vfullcalendar-react/timegrid';
import interaction from 'vfullcalendar-react/interaction';
import classic from 'vfullcalendar-react/themes/classic';
import 'vfullcalendar-react/skeleton.css';
import 'vfullcalendar-react/themes/classic/theme.css';
import 'vfullcalendar-react/themes/classic/palette.css';

<Calendar plugins={[dayGrid, timeGrid, interaction, classic]}
  initialView="dayGridMonth" height="100%" events={events}
  editable selectable selectMirror dayMaxEvents
  eventClick={({event}) => openEvent(event.id)} />
```

Give the parent a definite height when using `height="100%"`. The ref exposes
`getApi()` with navigation, event lookup/mutation, selection and refetch methods.
FullCalendar 7 has no `updateSize()`. The public callback names include
`CalendarRef`, `EventDisplayInfo`, `DateSelectInfo` and `EventClickInfo`.

## Scope and behavior

- Views: `dayGridMonth`, `dayGridWeek`, `dayGridDay`, `timeGridWeek`, `timeGridDay`.
- Events: arrays, callback/promise sources and JSON feeds; custom React content;
  multiday spans, overlapping timed events in separate columns, filtering and
  overflow popovers. Async results from obsolete ranges or unmounted calendars
  cannot replace current events.
- Interaction: click, pointer selection with preview, drag, resize and reversible
  event changes. `setDates()` preserves `allDay` when its replacement is omitted.
- Styling: `dayHeaderInnerClass`, `dayCellTopInnerClass`, `eventClass` and the
  other declared hooks; inherited `--fc-classic-*` variables support app themes.
  DOM structure and internal class names differ from upstream.
- Dates: local, UTC and named time zones through the independent headless engine.
  The Casablanca paired-offset fix, years below 100 and fragment-safe feed
  requests remain covered.

This is **application-scope compatibility**, not the full FullCalendar product.
Custom view/plugin internals, list and multimonth views, recurring/resource
calendars, external draggable integration, alternative theme packs and the full
locale catalog are excluded. English defaults and a French locale descriptor
ship; Intl handles formatting for supplied locale codes. Only the APIs in the
public declarations are supported. `eventContent` can receive `el: null` before
mounting; use `eventDidMount` when an element is needed. The rendered output is
not pixel-identical to the upstream themes.

## Verification and measurements

Six app-shaped cases run against the pinned original and VPM on Node 24/Bun.
Eleven additional cases cover lifecycle/StrictMode, context, callback updates,
reversible edits, stale async sources, option updates and date correctness.
Real Chromium checks selection, drag/revert/resize, spanning and overlapping
events, overflow, theme changes, narrow layouts, filtering and unmounting.
TypeScript 7 verifies the public consumer. VentiMath's committed source also
passes its full frontend typecheck against these declarations.

The original 27-test React suite is retained as an upstream control. The former
1,542-spec comparison describes the previous fork; it is **not** a parity claim
for this smaller implementation. See the [conformance record](../../scripts/fullcalendar-react-conformance/README.md).

The r2 application-shaped JS entry measured **13,025 bytes gzipped**, versus **82,453**
for upstream (84% smaller; React and CSS excluded). The supported scope is
smaller. Node timing directions are inconclusive; Bun navigation is 16% faster
and view switching 11% slower in the isolated jsdom workload.
[Reproduction and timing results](bench/results/README.md).

The r2 timing recordings above predate the event-identity and hour-label
corrections; those changes are verified through mount counts and browser
geometry/interaction tests, not new speed claims.

## Event identity correction

Release r3 retains internal keys for surviving, nonempty event IDs when an app
passes a new filtered or cloned event array. Custom React event content keeps
its state and mount effects. In r2, those components remounted each time;
VentiMath's label initialization could consequently trigger an endless update
cycle. Two mounted regressions reproduce both the lost identity and the cycle,
pass upstream, and pass with the correction. Duplicate IDs remain distinct
occurrences; removing an event and later adding it creates a new identity.
Use stable public IDs for event content that needs state preserved.

## Time-grid labels and remaining presentation limits

Release r4 places hour labels below their slot lines so the first visible hour is not clipped
at the default 6am scroll position. Browser checks cover week/day views, a custom
9am scroll time and a grid beginning at 6am. The pre-fix r3 stylesheet fails the
same text-bounds assertion. Slot geometry and scroll positions are unchanged.

Presentation compatibility remains limited: time-grid day headers use Intl
ordering without `omitCommas`; no additional full-date/weekday annotation is
provided. Timed `timeText` contains the start time only (`displayEventEnd` is not
implemented). The overflow dialog uses a fixed position rather than anchoring to
the clicked day. All-day and overflow labels remain English; `allDayText` and
`moreLinkText` are not implemented. The French descriptor translates toolbar
buttons and selects French date formatting, not all calendar text. These are
separate follow-ups, not claims of pixel or screen-reader parity.

## Event dates and cross-row dragging (r4)

Timed events retain their original instants separately from civil dates used for
layout. This preserves both occurrences of the repeated daylight-saving hour,
including a valid event whose local end clock appears earlier than its start.
Date getters, ISO strings, property edits, `setDates`, snapshots and revert retain
those instants. Calendar-day movement still uses calendar arithmetic.

Dragging between timed and all-day rows uses the grabbed date instead of its
clock slot, so a mid-event grab does not move the event to the previous day.
Like upstream, changing rows resets the duration unless `allDayMaintainDuration`
is enabled. The event's public `end` is normally null after this reset; the view
uses a one-hour timed or one-day all-day duration. Applications that persist a
required start/end pair should pass **`forceEventDuration`**. This produces an
explicit positive end, with `defaultTimedEventDuration` and
`defaultAllDayEventDuration` available to configure the defaults.

Seven mounted exact-instant tests pass against upstream 7.1.3 and VPM in local
Pacific and named Pacific time zones. Nine VPM pointer cases cover both row
transitions, mid-event grabs, another target date, default/custom/maintained
durations and revert. A separate VPM test preserves instants on zero movement;
upstream's zero movement loses fold metadata and is not claimed as a passing
control. Native Chrome repeats both drag directions and checks visible events.
The pre-r4 source fails the new date and drag assertions.

## Repeated-hour rendering and defaults (r5)

Day/week grids keep a positive-duration event visible when its clock labels run
backward or coincide during the repeated hour. The grid still has one row per
clock time: for these ranges, the block starts at the local start position and
extends by the exact elapsed duration. This is a layout projection; getters and
click callbacks retain the original instants. Existing slot clipping still applies.

Timed default hours/minutes now advance the exact starting instant. With
`forceEventDuration`, Pacific `2026-11-01T08:30:00Z` gets the default end
`09:30:00Z`, not `10:30:00Z`. All-day defaults remain calendar days. Explicit
calendar duration units retain their meaning too: `{ days: 1 }` may span 23 or
25 hours, while `{ hours: 24 }` is 24 elapsed hours. Keep the same
`forceEventDuration` setting used with r4; there are no new consumer options.

Ten additional mounted comparisons cover rendered event nodes/click payloads
in day/week views, local and named Pacific time zones, forced/default/custom
durations, spring-forward and fall-back, and all-day midnight boundaries. They
pass upstream and VPM; eight fail against r4. Native Chrome also checks positive
block geometry and trusted clicks for explicit and forced repeated-hour ranges.
These run against the exact release archives before and after publication.

## Adoption

VentiMath's committed frontend uses the three VPM calendar packages from
[`calendar-7.1.3`](https://github.com/VentiMath/vpm/releases/tag/calendar-7.1.3).
That immutable release contains the earlier adapted renderer. The independent
renderer, including the event-identity, hour-label and event-date corrections, is distributed as `calendar-7.1.3-r5`; the app must update
its release URL and lockfile to adopt it. Source adoption is verified; production
deployment is not inferred. See [installation](../../docs/INSTALLATION.md) and
[adoption evidence](../../docs/ADOPTION.md).

MIT. [Provenance](PROVENANCE.json) records the comparison baseline and scope.

## Timezone changes

[Calendar-day and runtime timezone checks](../../docs/TIME-ZONES.md) cover BC’s
2026 change, historical DST, exact event instants and runtime data requirements.
The current implementation passes; timezone rules remain supplied by the runtime
or scheduling service rather than a fixed provincial offset.
