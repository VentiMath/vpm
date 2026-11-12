export function checkCalendar(H, CalendarApi, cases, assert) {
  const locale = {
    codes: ["en-US"],
    week: { dow: 0, doy: 1 },
    options: {},
    simpleNumberFormat: new Intl.NumberFormat("en-US"),
  };
  let count = 0;
  for (const row of cases) {
    const env = new H.DateEnv({
      timeZone: row.zone,
      calendarSystem: "gregory",
      locale,
    });
    const [instant, wall, offset] = row.winter,
      marker = env.timestampToMarker(Date.parse(instant));
    assert(
      marker.toISOString() === new Date(wall).toISOString(),
      row.zone +
        " runtime has stale/incorrect timezone data: " +
        marker.toISOString(),
    );
    assert(
      env.offsetForMarker(marker) === offset,
      row.zone + " named-zone offset",
    );
    assert(
      env.toDate(marker).toISOString() === new Date(instant).toISOString(),
      row.zone + " wall-to-instant",
    );
    const format = new H.NativeDateFormatter({
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const text = H.joinDateTimeFormatParts(env.formatToParts(marker, format));
    assert(text === wall.slice(11, 16), row.zone + " formatted time " + text);
    count += 4;
    for (const [start, end, hours] of row.days) {
      const from = env.createMarker(start),
        to = env.add(from, H.createDuration({ days: 1 }));
      assert(
        to.toISOString().slice(0, 10) === end,
        row.zone + " next civil day",
      );
      assert(
        (+env.toDate(to) - +env.toDate(from)) / 3600000 === hours,
        row.zone + " elapsed day " + start,
      );
      const api = new CalendarApi({
        timeZone: row.zone,
        initialDate: start,
        forceEventDuration: true,
        events: [
          { id: "day", start, allDay: true },
          { id: "timed", start: start + "T00:30:00" },
        ],
      });
      const all = api.getEventById("day"),
        timed = api.getEventById("timed");
      assert(
        all.startStr === start && all.endStr === end,
        row.zone + " date-only event boundaries",
      );
      assert(
        (+all.end - +all.start) / 3600000 === hours,
        row.zone + " all-day duration",
      );
      assert(
        +timed.end - +timed.start === 3600000,
        row.zone + " elapsed timed default",
      );
      assert(
        Date.parse(timed.endStr) === +timed.end,
        row.zone + " serialized exact end",
      );
      count += 6;
    }
  }
  return count;
}
