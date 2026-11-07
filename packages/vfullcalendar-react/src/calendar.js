import React, {
  createContext,
  forwardRef,
  useContext,
  useRef,
  useReducer,
  useImperativeHandle,
  useLayoutEffect,
  useEffect,
  useState,
} from "react";
import { CalendarApi, EventApi } from "./model.js";
import {
  DAY,
  stamp,
  addDays,
  startOfDay,
  formatMarker,
  minutes,
} from "./dates.js";
const h = React.createElement,
  Context = createContext(null);
export const useCalendarController = () => useContext(Context);
export const joinClassNames = (...values) =>
  values.flat(Infinity).filter(Boolean).join(" ");
const css = (value, arg) =>
  joinClassNames(typeof value === "function" ? value(arg) : value);
const content = (value, arg, fallback) => {
  const result = typeof value === "function" ? value(arg) : value;
  if (result === undefined || result === true) return fallback;
  if (result?.html !== undefined)
    return h("span", {
      dangerouslySetInnerHTML: { __html: String(result.html) },
    });
  return result;
};
const dayInfo = (api, date) => ({
  date: api.env.toDate(date),
  isToday: stamp(date) === stamp(api.env.createMarker(api.now())),
  isOther: date.getUTCMonth() !== api.date.getUTCMonth(),
  isPast: +date < +startOfDay(api.env.createMarker(api.now())),
  isFuture: +date > +startOfDay(api.env.createMarker(api.now())),
  view: api.view,
});
const effectiveEnd = (record, api) =>
  record.end || api.defaultEnd(record.start, record.allDay, record.startMs).end;
function dayEvents(api, date) {
  return [...api.records.values()]
    .filter(
      (r) =>
        r.display !== "none" &&
        +r.start < +date + DAY &&
        +effectiveEnd(r, api) > +date,
    )
    .sort(
      (a, b) =>
        +a.start - +b.start ||
        +effectiveEnd(b, api) - +effectiveEnd(a, api) ||
        a.title.localeCompare(b.title),
    );
}
function Event({ api, record, start, end, style, dragging, resize = true }) {
  const ref = useRef(null),
    event = new EventApi(api, record),
    options = api.options;
  const info = {
    event,
    view: api.view,
    timeText: record.allDay
      ? ""
      : formatMarker(
          api.env,
          record.start,
          options.eventTimeFormat || {
            hour: "numeric",
            minute: "2-digit",
            omitZeroMinute: true,
            meridiem: "narrow",
          },
        ),
    isStart: +record.start >= +start,
    isEnd: +effectiveEnd(record, api) <= +end,
    isMirror: !!dragging,
    isPast: +effectiveEnd(record, api) < Date.now(),
    isFuture: +record.start > Date.now(),
    isToday: stamp(record.start) === stamp(api.env.createMarker(api.now())),
    el: ref.current,
  };
  useLayoutEffect(() => {
    options.eventDidMount?.({ ...info, el: ref.current });
    return () => api.options.eventWillUnmount?.({ ...info, el: ref.current });
  }, [record.key]);
  const click = (jsEvent) => {
    if (api.suppressClick) {
      api.suppressClick = false;
      jsEvent.preventDefault();
      return;
    }
    api.emit("eventClick", {
      event,
      el: ref.current,
      jsEvent: jsEvent.nativeEvent || jsEvent,
      view: api.view,
    });
  };
  return h(
    "div",
    {
      ref,
      role: "button",
      tabIndex: 0,
      "aria-label": (info.timeText + " " + record.title).trim(),
      "data-event-key": record.key,
      className: joinClassNames(
        "vfc-event",
        record.allDay && "vfc-all-day-event",
        css(options.eventClass, info),
        record.classNames,
      ),
      style: {
        ...style,
        backgroundColor: event.backgroundColor || undefined,
        borderColor: event.borderColor || undefined,
        color: event.textColor || undefined,
      },
      onClick: click,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          click(e);
        }
      },
    },
    content(
      options.eventContent,
      info,
      h(
        "span",
        null,
        info.timeText && h("strong", null, info.timeText + " "),
        record.title,
      ),
    ),
    resize &&
      (record.durationEditable ??
        record.editable ??
        options.eventDurationEditable ??
        options.editable) &&
      h("span", {
        "data-resize": "true",
        className: "vfc-resize",
        role: "separator",
        "aria-label": "Resize " + record.title,
      }),
  );
}
function Header({ api, days, time = false }) {
  return h(
    "div",
    {
      className: joinClassNames("vfc-day-headers", time && "vfc-time-headers"),
      style: {
        gridTemplateColumns:
          (time ? "56px " : "") + `repeat(${days.length},minmax(0,1fr))`,
      },
    },
    time && h("div", { "aria-hidden": true }),
    ...days.map((date) => {
      const info = dayInfo(api, date);
      return h(
        "div",
        {
          key: stamp(date),
          className: joinClassNames(
            "vfc-day-header",
            css(api.options.dayHeaderClass, info),
          ),
        },
        h(
          "span",
          { className: css(api.options.dayHeaderInnerClass, info) },
          content(
            api.options.dayHeaderContent,
            info,
            formatMarker(
              api.env,
              date,
              api.options.dayHeaderFormat ||
                (time
                  ? { weekday: "short", month: "numeric", day: "numeric" }
                  : { weekday: "short" }),
            ),
          ),
        ),
      );
    }),
  );
}
function selected(api, date, allDay) {
  const s = api.dragSelection || api.selection;
  return !!s && s.allDay === allDay && +date < +s.end && +date + DAY > +s.start;
}
function Month({ api, openMore }) {
  const container = useRef(null),
    [autoMax, setAutoMax] = useState(2);
  useLayoutEffect(() => {
    const el = container.current;
    const measure = () => {
      const week = el?.querySelector(".vfc-week"),
        event = el?.querySelector(".vfc-event");
      if (!week) return;
      const height = week.getBoundingClientRect().height;
      if (!height) return;
      const style = event && getComputedStyle(event);
      const row = event
        ? event.getBoundingClientRect().height +
          parseFloat(style.marginTop) +
          parseFloat(style.marginBottom)
        : 26;
      setAutoMax(
        Math.max(0, Math.floor((height - 34 - 22) / Math.max(22, row))),
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (el) observer?.observe(el);
    return () => observer?.disconnect();
  }, [api.type, api.options.eventContent]);
  const r = api.visibleRange,
    columns = api.options.weekends === false ? 5 : 7,
    weeks = [];
  for (let i = 0; i < r.days.length; i += columns)
    weeks.push(r.days.slice(i, i + columns));
  return h(
    "div",
    { className: "vfc-month" },
    h(Header, { api, days: weeks[0] || [] }),
    h(
      "div",
      { className: "vfc-month-weeks", ref: container },
      ...weeks.map((days) => {
        const lanes = [],
          segments = [];
        for (const record of [...api.records.values()].sort(
          (a, b) =>
            +a.start - +b.start ||
            +effectiveEnd(b, api) - +effectiveEnd(a, api),
        )) {
          const covered = days
            .map((d, i) =>
              +record.start < +d + DAY && +effectiveEnd(record, api) > +d
                ? i
                : -1,
            )
            .filter((i) => i >= 0);
          if (!covered.length || record.display === "none") continue;
          const from = covered[0],
            to = covered.at(-1) + 1;
          let row = lanes.findIndex((end) => end <= from);
          if (row < 0) row = lanes.length;
          lanes[row] = to;
          segments.push({ record, from, to, row });
        }
        const max =
          typeof api.options.dayMaxEvents === "number"
            ? Math.max(0, api.options.dayMaxEvents)
            : api.options.dayMaxEvents
              ? autoMax
              : Infinity;
        return h(
          "div",
          {
            className: "vfc-week",
            key: stamp(days[0]),
            style: { "--vfc-cols": days.length },
          },
          h(
            "div",
            { className: "vfc-day-cells" },
            ...days.map((date) => {
              const info = dayInfo(api, date);
              return h(
                "div",
                {
                  key: stamp(date),
                  "data-date": stamp(date),
                  "data-all-day": "true",
                  className: joinClassNames(
                    "vfc-day-cell",
                    info.isToday && "vfc-today",
                    info.isOther && "vfc-other",
                    selected(api, date, true) && "vfc-selected",
                    css(api.options.dayCellClass, info),
                  ),
                },
                h(
                  "div",
                  {
                    className: joinClassNames(
                      "vfc-day-top",
                      css(api.options.dayCellTopClass, info),
                    ),
                  },
                  h(
                    "button",
                    {
                      type: "button",
                      className: css(api.options.dayCellTopInnerClass, info),
                      "aria-label": formatMarker(api.env, date, {
                        dateStyle: "full",
                      }),
                      onKeyDown: (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          api.select({
                            start: stamp(date),
                            end: stamp(addDays(date, 1)),
                            allDay: true,
                            jsEvent: e.nativeEvent,
                          });
                        }
                      },
                    },
                    content(
                      api.options.dayCellTopContent,
                      info,
                      String(date.getUTCDate()),
                    ),
                  ),
                ),
              );
            }),
          ),
          h(
            "div",
            { className: "vfc-week-events" },
            ...segments
              .filter((s) => s.row < max)
              .map((s) =>
                h(Event, {
                  key: s.record.key,
                  api,
                  record: s.record,
                  start: days[0],
                  end: addDays(days.at(-1), 1),
                  style: {
                    gridColumn: `${s.from + 1} / ${s.to + 1}`,
                    gridRow: s.row + 1,
                  },
                }),
              ),
            ...days.map((date, i) => {
              const hidden = segments.filter(
                (s) => s.row >= max && s.from <= i && s.to > i,
              );
              return hidden.length
                ? h(
                    "button",
                    {
                      type: "button",
                      key: "more-" + i,
                      className: "vfc-more",
                      style: { gridColumn: i + 1, gridRow: max + 1 },
                      onClick: (e) => {
                        e.stopPropagation();
                        openMore({ date, events: dayEvents(api, date) });
                      },
                    },
                    "+" + hidden.length + " more",
                  )
                : null;
            }),
          ),
        );
      }),
    ),
  );
}
function timedLayout(records, date, min, max, api) {
  const entries = records
      .map((record) => {
        const start = (+record.start - +date) / 60000;
        const endpoint = record.end
          ? { end: record.end, endMs: record.endMs }
          : api.defaultEnd(record.start, false, record.startMs);
        let end = (+endpoint.end - +date) / 60000;
        if (end <= start) {
          // The grid has one row per clock time, not a duplicate repeated hour.
          // Project a positive real duration from the start's clock position
          // rather than dropping a valid fold-crossing or equal-clock event.
          const elapsed =
            (endpoint.endMs ?? +api.env.toDate(endpoint.end)) -
            (record.startMs ?? +api.env.toDate(record.start));
          if (elapsed > 0) end = start + elapsed / 60000;
        }
        return { record, start: Math.max(min, start), end: Math.min(max, end) };
      })
      .filter((x) => x.end > x.start)
      .sort((a, b) => a.start - b.start || b.end - a.end),
    clusters = [];
  let cluster;
  for (const item of entries) {
    if (!cluster || item.start >= cluster.end) {
      cluster = { end: item.end, items: [], lanes: [] };
      clusters.push(cluster);
    }
    cluster.end = Math.max(cluster.end, item.end);
    let col = cluster.lanes.findIndex((end) => end <= item.start);
    if (col < 0) col = cluster.lanes.length;
    cluster.lanes[col] = item.end;
    item.column = col;
    cluster.items.push(item);
  }
  return clusters.flatMap((c) =>
    c.items.map((item) => ({ ...item, columns: c.lanes.length })),
  );
}
function AllDay({ api, days, openMore }) {
  const lanes = [],
    segments = [];
  for (const record of [...api.records.values()]
    .filter((e) => e.allDay && e.display !== "none")
    .sort(
      (a, b) =>
        +a.start - +b.start || +effectiveEnd(b, api) - +effectiveEnd(a, api),
    )) {
    const covered = days
      .map((date, i) =>
        +record.start < +date + DAY && +effectiveEnd(record, api) > +date
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
    if (!covered.length) continue;
    const from = covered[0],
      to = covered.at(-1) + 1;
    let row = lanes.findIndex((end) => end <= from);
    if (row < 0) row = lanes.length;
    lanes[row] = to;
    segments.push({ record, from, to, row });
  }
  const max =
    typeof api.options.dayMaxEvents === "number"
      ? Math.max(0, api.options.dayMaxEvents)
      : api.options.dayMaxEvents
        ? 3
        : Infinity;
  return h(
    "div",
    { className: "vfc-all-day-row" },
    h(
      "div",
      {
        className: "vfc-all-day-background",
        style: {
          gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))`,
        },
      },
      h("div", { className: "vfc-axis" }, "all-day"),
      ...days.map((date) =>
        h("div", {
          key: stamp(date),
          "data-date": stamp(date),
          "data-all-day": "true",
          className: joinClassNames(
            "vfc-all-day-cell",
            selected(api, date, true) && "vfc-selected",
          ),
        }),
      ),
    ),
    h(
      "div",
      {
        className: "vfc-all-day-events",
        style: { gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))` },
      },
      ...segments
        .filter((s) => s.row < max)
        .map((s) =>
          h(Event, {
            key: s.record.key,
            api,
            record: s.record,
            start: days[0],
            end: addDays(days.at(-1), 1),
            style: {
              gridColumn: `${s.from + 1} / ${s.to + 1}`,
              gridRow: s.row + 1,
            },
          }),
        ),
      ...days.map((date, i) => {
        const hidden = segments.filter(
          (s) => s.row >= max && s.from <= i && s.to > i,
        );
        return hidden.length
          ? h(
              "button",
              {
                key: i,
                type: "button",
                className: "vfc-more",
                style: { gridColumn: i + 1, gridRow: max + 1 },
                onClick: () =>
                  openMore({
                    date,
                    events: dayEvents(api, date).filter((e) => e.allDay),
                  }),
              },
              "+" + hidden.length + " more",
            )
          : null;
      }),
    ),
  );
}
function TimeGrid({ api, openMore }) {
  const selection = api.dragSelection || api.selection;
  const days = api.visibleRange.days,
    min = minutes(api.options.slotMinTime, 0),
    max = minutes(api.options.slotMaxTime, 1440),
    slot = minutes(api.options.slotDuration, 30),
    scroll = useRef(null);
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(slot) ||
    max <= min ||
    slot <= 0 ||
    (max - min) / slot > 5000
  )
    throw new RangeError("Invalid time grid slots");
  const height = Math.max(48, ((max - min) / slot) * 24);
  useLayoutEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = Math.max(
        0,
        ((minutes(api.options.scrollTime, 360) - min) / slot) * 24,
      );
  }, [api.type]);
  const slots = [];
  for (let m = min; m < max; m += slot) slots.push(m);
  return h(
    "div",
    { className: "vfc-time-view" },
    h(Header, { api, days, time: true }),
    h(AllDay, { api, days, openMore }),
    h(
      "div",
      { className: "vfc-time-scroll", ref: scroll },
      h(
        "div",
        {
          className: "vfc-time-body",
          style: {
            gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))`,
            height,
          },
        },
        h(
          "div",
          { className: "vfc-axis" },
          ...slots.map((m) =>
            h(
              "div",
              { key: m, className: "vfc-slot-label", style: { height: 24 } },
              m % 60 === 0
                ? formatMarker(api.env, new Date(+days[0] + m * 60000), {
                    hour: "numeric",
                    meridiem: "short",
                  })
                : "",
            ),
          ),
        ),
        ...days.map((date) => {
          const info = dayInfo(api, date);
          return h(
            "div",
            {
              key: stamp(date),
              "data-date": stamp(date),
              "data-time-column": "true",
              "data-min": min,
              "data-max": max,
              className: joinClassNames(
                "vfc-time-column",
                info.isToday && "vfc-today",
                css(api.options.dayCellClass, info),
              ),
            },
            ...slots.map((m) =>
              h("div", {
                key: m,
                className: "vfc-slot",
                style: { height: 24 },
                "data-minute": m,
                "aria-hidden": true,
              }),
            ),
            ...timedLayout(
              dayEvents(api, date).filter((e) => !e.allDay),
              date,
              min,
              max,
              api,
            ).map((e) =>
              h(Event, {
                key: e.record.key,
                api,
                record: e.record,
                start: date,
                end: addDays(date, 1),
                style: {
                  position: "absolute",
                  top: ((e.start - min) / (max - min)) * 100 + "%",
                  height: Math.max(18, ((e.end - e.start) / slot) * 24),
                  left: (e.column / e.columns) * 100 + "%",
                  width: 100 / e.columns + "%",
                  margin: 0,
                },
              }),
            ),
            selection &&
              !selection.allDay &&
              +selection.start < +date + max * 60000 &&
              +selection.end > +date + min * 60000 &&
              h("div", {
                className: "vfc-time-selection",
                style: {
                  top:
                    (Math.max(0, (+selection.start - +date) / 60000 - min) /
                      (max - min)) *
                      100 +
                    "%",
                  height:
                    ((Math.min(+date + max * 60000, +selection.end) -
                      Math.max(+date + min * 60000, +selection.start)) /
                      60000 /
                      (max - min)) *
                      100 +
                    "%",
                },
              }),
          );
        }),
      ),
    ),
  );
}
function Toolbar({ api }) {
  const input = api.options.headerToolbar;
  if (input === false) return null;
  const config = input || { start: "title", end: "today prev,next" };
  return h(
    "div",
    {
      className: joinClassNames(
        "vfc-toolbar",
        css(api.options.toolbarClass, { view: api.view }),
      ),
    },
    ...["start", "center", "end"].map((side) =>
      h(
        "div",
        { key: side },
        ...String(config[side] || "")
          .split(/[ ,]+/)
          .filter(Boolean)
          .map((item) =>
            item === "title"
              ? h("h2", { key: item }, api.view.title)
              : h(
                  "button",
                  {
                    key: item,
                    type: "button",
                    onClick: () =>
                      typeof api[item] === "function"
                        ? api[item]()
                        : api.changeView(item),
                    "aria-label": item,
                  },
                  api.options.buttonText?.[item] ||
                    { prev: "‹", next: "›", today: "today" }[item] ||
                    item,
                ),
          ),
      ),
    ),
  );
}
function hit(root, event, api) {
  const el =
    root.ownerDocument.elementFromPoint?.(event.clientX, event.clientY) ||
    event.target;
  const cell =
    el?.closest?.("[data-date]") ||
    [...root.querySelectorAll("[data-date]")].find((candidate) => {
      const b = candidate.getBoundingClientRect();
      return (
        event.clientX >= b.left &&
        event.clientX < b.right &&
        event.clientY >= b.top &&
        event.clientY < b.bottom
      );
    });
  if (!cell || !root.contains(cell)) return null;
  const date = api.env.createMarker(cell.dataset.date);
  if (!date) return null;
  const column = cell.closest("[data-time-column]");
  if (!column) return { date, allDay: true };
  const box = column.getBoundingClientRect(),
    min = Number(column.dataset.min),
    max = Number(column.dataset.max),
    snap = minutes(
      api.options.snapDuration,
      minutes(api.options.slotDuration, 30),
    );
  const minute = Math.max(
    min,
    Math.min(
      max - snap,
      Math.floor(
        (((event.clientY - box.top) / box.height) * (max - min) + min) / snap,
      ) * snap,
    ),
  );
  return { date: new Date(+date + minute * 60000), allDay: false };
}
export const Calendar = forwardRef(function Calendar(props, ref) {
  const [, render] = useReducer((x) => x + 1, 0),
    holder = useRef(null);
  if (!holder.current) holder.current = new CalendarApi(props);
  const api = holder.current;
  api.updateOptions(props);
  const options = api.options;
  api.notify = render;
  const root = useRef(null),
    gesture = useRef(null),
    [preview, setPreview] = useState(null),
    [more, setMore] = useState(null);
  const r = api.visibleRange;
  useImperativeHandle(ref, () => ({ getApi: () => api }), [api]);
  useLayoutEffect(() => {
    api.notify = render;
    return () => {
      clearTimeout(gesture.current?.timer);
      api.destroy();
    };
  }, [api]);
  useLayoutEffect(() => {
    api.emit("datesSet", api.datesInfo());
  }, [api.type, +r.start, +r.end, api.env.timeZone]);
  useLayoutEffect(() => {
    api.emit("viewDidMount", { view: api.view, el: root.current });
    return () =>
      api.emit("viewWillUnmount", { view: api.view, el: root.current });
  }, [api.type]);
  useLayoutEffect(() => {
    api.emit("eventsSet", api.getEvents());
  }, [api.revision]);
  useEffect(() => {
    if (
      options.eventSources ||
      (options.events && !Array.isArray(options.events))
    )
      void api.refetchEvents();
  }, [options.events, options.eventSources, api.type, +r.start, +r.end]);
  function reset() {
    const g = gesture.current;
    clearTimeout(g?.timer);
    if (g && root.current?.hasPointerCapture?.(g.id))
      root.current.releasePointerCapture(g.id);
    gesture.current = null;
    api.dragSelection = null;
    setPreview(null);
  }
  function down(event) {
    if (
      event.button !== 0 ||
      event.target.closest(".vfc-more,.vfc-toolbar,.vfc-popover")
    )
      return;
    const point = hit(root.current, event, api);
    if (!point) return;
    const node = event.target.closest("[data-event-key]"),
      record = node && api.records.get(node.dataset.eventKey),
      resize = !!event.target.closest("[data-resize]");
    if (
      record &&
      !(resize
        ? (record.durationEditable ??
          record.editable ??
          options.eventDurationEditable ??
          options.editable)
        : (record.startEditable ??
          record.editable ??
          options.eventStartEditable ??
          options.editable))
    )
      return;
    if (!record && !options.selectable) return;
    const g = {
      el: node,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      point,
      record,
      resize,
      moved: false,
      ready: event.pointerType !== "touch",
    };
    gesture.current = g;
    if (!g.ready)
      g.timer = setTimeout(() => {
        g.ready = true;
        root.current?.setPointerCapture?.(g.id);
      }, options.longPressDelay ?? 1000);
  }
  function move(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - g.x, event.clientY - g.y) > 4;
    if (!g.ready) {
      if (moved) reset();
      return;
    }
    if (moved) {
      g.moved = true;
      root.current.setPointerCapture?.(g.id);
    }
    if (!g.moved) return;
    event.preventDefault();
    const point = hit(root.current, event, api);
    if (point) {
      g.target = point;
      if (!g.record && options.selectMirror && point.allDay === g.point.allDay)
        api.dragSelection = {
          start: new Date(Math.min(+point.date, +g.point.date)),
          end: new Date(
            Math.max(+point.date, +g.point.date) +
              (point.allDay ? DAY : minutes(options.snapDuration, 30) * 60000),
          ),
          allDay: point.allDay,
        };
      setPreview(point);
    }
  }
  function up(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const point = g.target || hit(root.current, event, api);
    const active = g.ready;
    reset();
    if (!active || !point) return;
    if (g.record) {
      if (!g.moved) return;
      api.suppressClick = true;
      setTimeout(() => {
        api.suppressClick = false;
      }, 0);
      const previous = g.record;
      const dayGrid = api.type.startsWith("dayGrid");
      const allDay = g.resize || dayGrid ? previous.allDay : point.allDay;
      const switching = allDay !== previous.allDay;
      // Changing rows anchors to the grabbed date, not the grabbed clock slot.
      // Retain the day offset when grabbing a later day of a multi-day event.
      const delta = switching
        ? +point.date - +startOfDay(g.point.date)
        : +point.date - +g.point.date;
      let start = g.resize
        ? previous.start
        : new Date(
            +(switching ? startOfDay(previous.start) : previous.start) + delta,
          );
      let end = g.resize
        ? dayGrid
          ? new Date(+effectiveEnd(previous, api) + delta)
          : new Date(
              +point.date +
                (allDay ? DAY : minutes(options.snapDuration, 30) * 60000),
            )
        : previous.end
          ? new Date(+previous.end + delta)
          : null;
      if (switching) {
        end =
          options.allDayMaintainDuration && previous.end
            ? new Date(
                +start +
                  (allDay
                    ? Math.floor((+previous.end - +previous.start) / DAY) * DAY
                    : +previous.end - +previous.start),
              )
            : null;
      }
      if (allDay) {
        start = startOfDay(start);
        if (end) end = startOfDay(end);
      }
      if (end && +end <= +start) {
        if (!switching) return;
        end = null;
      }
      const forcedEnd =
        !end && options.forceEventDuration
          ? api.defaultEnd(
              start,
              allDay,
              +start === +previous.start ? previous.startMs : undefined,
            )
          : null;
      if (forcedEnd) end = forcedEnd.end;
      api.change(
        previous,
        {
          start,
          end,
          allDay,
          ...forcedEnd,
        },
        (info) =>
          api.emit(g.resize ? "eventResize" : "eventDrop", {
            ...info,
            delta: {
              years: 0,
              months: 0,
              days: Math.trunc(delta / DAY),
              milliseconds: delta % DAY,
            },
            startDelta: { years: 0, months: 0, days: 0, milliseconds: 0 },
            endDelta: {
              years: 0,
              months: 0,
              days: 0,
              milliseconds: end ? +end - +effectiveEnd(previous, api) : 0,
            },
            el: g.el,
            jsEvent: event.nativeEvent,
            view: api.view,
          }),
      );
    } else {
      const allDay = g.point.allDay;
      if (point.allDay !== allDay) return;
      const first = new Date(Math.min(+point.date, +g.point.date)),
        last = new Date(
          Math.max(+point.date, +g.point.date) +
            (allDay ? DAY : minutes(options.snapDuration, 30) * 60000),
        );
      api.select({
        start: api.env.toDate(first),
        end: api.env.toDate(last),
        allDay,
        jsEvent: event.nativeEvent,
      });
      if (!g.moved)
        api.emit("dateClick", {
          date: api.env.toDate(first),
          dateStr: api.env.formatIso(first, { omitTime: allDay }),
          allDay,
          dayEl: event.target.closest("[data-date]"),
          jsEvent: event.nativeEvent,
          view: api.view,
        });
    }
  }
  return h(
    Context.Provider,
    { value: api },
    h(
      "div",
      {
        ref: root,
        className: joinClassNames(
          "vfc-calendar",
          options.borderless && "vfc-borderless",
          options.className,
        ),
        dir: options.direction || "ltr",
        style: {
          height: options.height ?? options.contentHeight ?? 650,
          ...options.style,
        },
        onPointerDown: down,
        onPointerMove: move,
        onPointerUp: up,
        onPointerCancel: reset,
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            reset();
            setMore(null);
            api.unselect(e.nativeEvent);
          }
        },
      },
      h(Toolbar, { api }),
      api.type.startsWith("timeGrid")
        ? h(TimeGrid, { api, openMore: setMore })
        : h(Month, { api, openMore: setMore }),
      preview &&
        h(
          "div",
          { className: "vfc-drag-preview", role: "status" },
          stamp(preview.date) +
            (preview.allDay
              ? ""
              : " " +
                formatMarker(api.env, preview.date, {
                  hour: "numeric",
                  minute: "2-digit",
                })),
        ),
      more &&
        h(
          "div",
          {
            className: "vfc-popover",
            role: "dialog",
            "aria-label": "Events on " + stamp(more.date),
          },
          h(
            "button",
            {
              type: "button",
              onClick: () => setMore(null),
              "aria-label": "Close events",
            },
            "×",
          ),
          h(
            "strong",
            null,
            formatMarker(api.env, more.date, { dateStyle: "full" }),
          ),
          ...more.events.map((record) =>
            h(Event, {
              api,
              key: record.key,
              record,
              start: more.date,
              end: addDays(more.date, 1),
              resize: false,
            }),
          ),
        ),
    ),
  );
});
