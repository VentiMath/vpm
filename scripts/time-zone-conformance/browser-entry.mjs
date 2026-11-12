import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Calendar from "../../packages/vfullcalendar-react/index.js";
import timegrid from "../../packages/vfullcalendar-react/timegrid.js";
import { CalendarApi } from "../../packages/vfullcalendar-react/src/model.js";
import * as H from "../../packages/vfull-ui-headless-calendar/index.js";
import moment from "../../packages/vmoment/index.cjs";
import cases from "./cases.cjs";
import { checkCalendar } from "./checks.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
window.timezoneVariant = "vpm";
window.runTimezoneChecks = async () => {
  const count = checkCalendar(H, CalendarApi, cases, assert),
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    row = cases.find((x) => x.zone === zone);
  assert(!!row, "unexpected emulated timezone " + zone);
  for (const [start, end, hours] of row.days) {
    const a = moment(start),
      b = a.clone().add(1, "day");
    assert(b.toDate().getDate() === +end.slice(-2), "native next date");
    assert(b.diff(a, "hours", true) === hours, "native calendar hours");
  }
  for (const timeZone of [
    "local",
    "America/Vancouver",
    "America/Los_Angeles",
  ]) {
    const host = document.createElement("div");
    host.style.height = "600px";
    document.body.append(host);
    const root = createRoot(host),
      ref = React.createRef();
    try {
      flushSync(() =>
        root.render(
          React.createElement(Calendar, {
            ref,
            plugins: [timegrid],
            timeZone,
            initialDate: "2026-11-01",
            initialView: "timeGridDay",
            height: 600,
            slotMinTime: "00:00",
            slotMaxTime: "05:00",
            forceEventDuration: true,
            events: [
              {
                id: "cross",
                title: "Cross",
                start: "2026-11-01T08:45:00Z",
                end: "2026-11-01T09:15:00Z",
              },
            ],
            eventContent: ({ event }) =>
              React.createElement(
                "span",
                { "data-timezone-probe": event.id },
                event.title,
              ),
          }),
        ),
      );
      await new Promise(requestAnimationFrame);
      const event = ref.current.getApi().getEventById("cross"),
        node = host.querySelector('[data-timezone-probe="cross"]');
      assert(!!node, timeZone + " event must render");
      assert(
        node.getBoundingClientRect().height > 0,
        timeZone + " visible event",
      );
      assert(
        event.start.toISOString() === "2026-11-01T08:45:00.000Z" &&
          event.end.toISOString() === "2026-11-01T09:15:00.000Z",
        timeZone + " exact event instants",
      );
    } finally {
      flushSync(() => root.unmount());
      host.remove();
    }
  }
  return count;
};
