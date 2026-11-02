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

Four app-shaped cases run against the pinned original and VPM on Node 24/Bun.
Eleven additional cases cover lifecycle/StrictMode, context, callback updates,
reversible edits, stale async sources, option updates and date correctness.
Real Chromium checks selection, drag/revert/resize, spanning and overlapping
events, overflow, theme changes, narrow layouts, filtering and unmounting.
TypeScript 7 verifies the public consumer. VentiMath's committed source also
passes its full frontend typecheck against these declarations.

The original 27-test React suite is retained as an upstream control. The former
1,542-spec comparison describes the previous fork; it is **not** a parity claim
for this smaller implementation. See the [conformance record](../../scripts/fullcalendar-react-conformance/README.md).

The application-shaped JS entry is **13,025 bytes gzipped**, versus **82,453**
for upstream (84% smaller; React and CSS excluded). The supported scope is
smaller. Node timing directions are inconclusive; Bun navigation is 16% faster
and view switching 11% slower in the isolated jsdom workload.
[Reproduction and timing results](bench/results/README.md).

## Adoption

VentiMath's committed frontend uses the three VPM calendar packages from
[`calendar-7.1.3`](https://github.com/VentiMath/vpm/releases/tag/calendar-7.1.3).
That immutable release contains the earlier adapted renderer. The independent
renderer is distributed separately as `calendar-7.1.3-r2`; the app must update
its release URL and lockfile to adopt it. Source adoption is verified; production
deployment is not inferred. See [installation](../../docs/INSTALLATION.md) and
[adoption evidence](../../docs/ADOPTION.md).

MIT. [Provenance](PROVENANCE.json) records the comparison baseline and scope.
