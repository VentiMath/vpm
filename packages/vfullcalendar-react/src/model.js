import {
  environment,
  marker,
  range,
  stamp,
  DAY,
  addDays,
  startOfDay,
  monthShift,
  createDuration,
} from "./dates.js";
import { requestJson } from "vfullcalendar-core/protected-api";
import { buildIsoString } from "vfull-ui-headless-calendar";
let nextId = 0;
// Civil markers drive layout; exact instants disambiguate the repeated DST hour.
const instant = (env, value, ms) => ms ?? +env.toDate(value);
function dateFields(
  env,
  startInput,
  endInput,
  allDay,
  first = env.createMarkerMeta(startInput),
) {
  if (!first) throw new RangeError("Invalid calendar date");
  const last = endInput == null ? null : env.createMarkerMeta(endInput);
  const start = allDay ? startOfDay(first.marker) : first.marker;
  const startMs = allDay ? undefined : instant(env, start, first.instantMs);
  let end = last ? (allDay ? startOfDay(last.marker) : last.marker) : null;
  let endMs = end && !allDay ? instant(env, end, last.instantMs) : undefined;
  if (end && (endMs ?? +end) <= (startMs ?? +start)) {
    end = null;
    endMs = undefined;
  }
  return { start, end, startMs, endMs, allDay };
}
function dateString(env, record, key) {
  const value = record[key];
  if (!value) return "";
  const ms = record[key + "Ms"];
  return buildIsoString(
    value,
    record.allDay ? null : (+value - instant(env, value, ms)) / 60000,
    record.allDay,
  );
}
const copy = (r) => ({
  ...r,
  start: new Date(+r.start),
  end: r.end && new Date(+r.end),
  extendedProps: { ...r.extendedProps },
});
export class EventApi {
  constructor(calendar, record, detached = false) {
    this.calendar = calendar;
    this.record = record;
    this.detached = detached;
  }
  get data() {
    return this.detached
      ? this.record
      : this.calendar.records.get(this.record.key) || this.record;
  }
  get id() {
    return this.data.id;
  }
  get title() {
    return this.data.title;
  }
  get allDay() {
    return this.data.allDay;
  }
  get start() {
    return new Date(
      instant(this.calendar.env, this.data.start, this.data.startMs),
    );
  }
  get end() {
    return this.data.end
      ? new Date(instant(this.calendar.env, this.data.end, this.data.endMs))
      : null;
  }
  get startStr() {
    return dateString(this.calendar.env, this.data, "start");
  }
  get endStr() {
    return dateString(this.calendar.env, this.data, "end");
  }
  get extendedProps() {
    return Object.freeze({ ...this.data.extendedProps });
  }
  get url() {
    return this.data.url || "";
  }
  get backgroundColor() {
    return this.data.backgroundColor || this.data.color || "";
  }
  get borderColor() {
    return this.data.borderColor || this.data.color || "";
  }
  get textColor() {
    return this.data.textColor || "";
  }
  get display() {
    return this.data.display || "auto";
  }
  get classNames() {
    return [...(this.data.classNames || [])];
  }
  setProp(name, value) {
    if (
      [
        "id",
        "title",
        "url",
        "display",
        "backgroundColor",
        "borderColor",
        "textColor",
        "editable",
        "startEditable",
        "durationEditable",
        "groupId",
        "color",
        "classNames",
      ].includes(name)
    )
      this.calendar.change(this.data, { [name]: value });
    else
      throw new TypeError(
        "Use the date or extended-property methods for " + name,
      );
  }
  setExtendedProp(name, value) {
    this.calendar.change(this.data, {
      extendedProps: { ...this.data.extendedProps, [name]: value },
    });
  }
  setDates(start, end, options = {}) {
    const allDay = options.allDay ?? this.allDay;
    this.calendar.change(
      this.data,
      dateFields(this.calendar.env, start, end, allDay),
    );
  }
  setStart(start, options = {}) {
    const meta = this.calendar.env.createMarkerMeta(start);
    if (!meta) throw new RangeError("Invalid calendar date");
    const first = new Date(
        instant(this.calendar.env, meta.marker, meta.instantMs),
      ),
      delta = +first - +this.start;
    this.setDates(
      first,
      options.maintainDuration && this.data.end
        ? new Date(+this.end + delta)
        : this.end,
    );
  }
  setEnd(end) {
    this.setDates(this.start, end);
  }
  setAllDay(allDay) {
    this.setDates(this.start, this.end, { allDay });
  }
  moveDates(delta) {
    const d = createDuration(delta);
    this.calendar.change(this.data, {
      start: this.calendar.env.add(this.data.start, d),
      end: this.data.end && this.calendar.env.add(this.data.end, d),
    });
  }
  remove() {
    this.calendar.remove(this.data);
  }
  toPlainObject() {
    return {
      id: this.id,
      title: this.title,
      allDay: this.allDay,
      start: this.startStr,
      ...(this.endStr ? { end: this.endStr } : {}),
      extendedProps: { ...this.data.extendedProps },
      ...(this.url ? { url: this.url } : {}),
    };
  }
  toJSON() {
    return this.toPlainObject();
  }
}
export class CalendarApi {
  constructor(options, notify = () => {}) {
    this.options = { ...options };
    this.props = options;
    this.env = environment(options);
    this.date = marker(this.env, options.initialDate ?? this.now());
    this.type = options.initialView || "dayGridMonth";
    this.notify = notify;
    this.records = new Map();
    this.epoch = 0;
    this.revision = 0;
    this.batch = 0;
    this.selection = null;
    this.replaceEvents(options.events ?? options.initialEvents ?? []);
  }
  now() {
    return typeof this.options.now === "function"
      ? this.options.now()
      : (this.options.now ?? new Date());
  }
  defaultEnd(start, allDay, startMs) {
    const value = allDay
      ? this.options.defaultAllDayEventDuration
      : this.options.defaultTimedEventDuration;
    const duration =
      createDuration(value) ||
      createDuration(allDay ? { days: 1 } : { hours: 1 });
    if (allDay) {
      const end = this.env.add(start, duration);
      return { end: +end > +start ? end : addDays(start, 1), endMs: undefined };
    }
    // Hours/minutes are elapsed time. Explicit calendar units retain calendar
    // arithmetic, so { days: 1 } and { hours: 24 } differ on a DST change.
    const firstMs = instant(this.env, start, startMs);
    const anchorMs =
      duration.years || duration.months || duration.days
        ? +this.env.toDate(
            this.env.add(start, { ...duration, milliseconds: 0 }),
          )
        : firstMs;
    let endMs = anchorMs + duration.milliseconds;
    if (endMs <= firstMs) endMs = firstMs + 3600000;
    return { end: this.env.timestampToMarker(endMs), endMs };
  }
  normalize(input) {
    const startInput = input.start ?? input.date;
    if (startInput == null) return null;
    const meta = this.env.createMarkerMeta(startInput);
    if (!meta) return null;
    const allDay = input.allDay ?? meta.isTimeUnspecified;
    const dates = dateFields(this.env, startInput, input.end, allDay, meta);
    if (!dates.end && this.options.forceEventDuration) {
      Object.assign(dates, this.defaultEnd(dates.start, allDay, dates.startMs));
    }
    return {
      ...input,
      key: "event-" + ++nextId,
      id: String(input.id ?? ""),
      title: String(input.title ?? ""),
      ...dates,
      extendedProps: { ...input.extendedProps },
      classNames:
        typeof input.className === "string"
          ? input.className.split(/\s+/)
          : [...(input.classNames || [])],
    };
  }
  replaceEvents(input) {
    this.inputEvents = input;
    if (!Array.isArray(input)) return;
    // A new filtered array is not a new set of React components. Retain keys
    // for surviving public IDs so custom event content keeps its mounted state.
    // Queues preserve distinct occurrences when a source repeats an ID.
    const available = new Map();
    for (const record of this.records.values())
      if (record.id) {
        let bucket = available.get(record.id);
        if (!bucket)
          available.set(record.id, (bucket = { keys: [], index: 0 }));
        bucket.keys.push(record.key);
      }
    const next = new Map();
    for (const item of input) {
      const r = this.normalize(item);
      if (r) {
        const bucket = r.id && available.get(r.id);
        if (bucket && bucket.index < bucket.keys.length)
          r.key = bucket.keys[bucket.index++];
        next.set(r.key, r);
      }
    }
    this.records = next;
    this.revision++;
  }
  updateOptions(options, fromProps = true) {
    if (fromProps) {
      const next = { ...this.options };
      for (const key of new Set([
        ...Object.keys(this.props),
        ...Object.keys(options),
      ]))
        if (options[key] !== this.props[key]) next[key] = options[key];
      this.props = options;
      options = next;
    }
    const old = this.options;
    this.options = { ...options };
    if (
      old.timeZone !== options.timeZone ||
      old.locale !== options.locale ||
      old.firstDay !== options.firstDay
    ) {
      const instant = this.env.toDate(this.date);
      this.env = environment(options);
      this.date = marker(this.env, instant);
      this.replaceEvents(options.events ?? options.initialEvents ?? []);
    } else if (
      options.events !== this.inputEvents &&
      Array.isArray(options.events)
    )
      this.replaceEvents(options.events);
  }
  emit(name, info) {
    return this.options[name]?.(info);
  }
  changed() {
    this.revision++;
    if (!this.batch) this.notify();
  }
  get view() {
    const r = range(this.env, this.date, this.type, this.options);
    return {
      type: r.type,
      title: r.title,
      calendar: this,
      activeStart: this.env.toDate(r.start),
      activeEnd: this.env.toDate(r.end),
      currentStart: this.env.toDate(r.currentStart),
      currentEnd: this.env.toDate(r.currentEnd),
    };
  }
  get visibleRange() {
    return range(this.env, this.date, this.type, this.options);
  }
  datesInfo() {
    const r = this.visibleRange;
    return {
      start: this.env.toDate(r.start),
      end: this.env.toDate(r.end),
      startStr: this.env.formatIso(r.start),
      endStr: this.env.formatIso(r.end),
      timeZone: this.env.timeZone,
      view: this.view,
    };
  }
  getDate() {
    return this.env.toDate(this.date);
  }
  formatIso(date, options) {
    return this.env.formatIso(marker(this.env, date), options);
  }
  getOption(name) {
    return this.options[name];
  }
  setOption(name, value) {
    this.updateOptions({ ...this.options, [name]: value }, false);
    this.changed();
  }
  changeView(type, date) {
    range(this.env, this.date, type, this.options);
    this.type = type;
    if (date !== undefined) this.date = marker(this.env, date);
    this.unselect();
    this.changed();
  }
  gotoDate(date) {
    this.date = marker(this.env, date);
    this.changed();
  }
  shift(direction) {
    if (this.options.dateIncrement)
      this.date = this.env.add(
        this.date,
        createDuration(this.options.dateIncrement),
      );
    else
      this.date =
        this.type === "dayGridMonth"
          ? monthShift(this.date, direction)
          : addDays(
              this.date,
              direction * (this.type.endsWith("Week") ? 7 : 1),
            );
    this.changed();
  }
  next() {
    this.shift(1);
  }
  prev() {
    if (this.options.dateIncrement) {
      this.date = this.env.subtract(
        this.date,
        createDuration(this.options.dateIncrement),
      );
      this.changed();
    } else this.shift(-1);
  }
  nextYear() {
    this.date = monthShift(this.date, 12);
    this.changed();
  }
  prevYear() {
    this.date = monthShift(this.date, -12);
    this.changed();
  }
  today() {
    this.gotoDate(this.now());
  }
  incrementDate(delta) {
    this.date = this.env.add(this.date, createDuration(delta));
    this.changed();
  }
  getEvents() {
    return [...this.records.values()].map((r) => new EventApi(this, r));
  }
  getEventById(id) {
    const r = [...this.records.values()].find((r) => r.id === String(id));
    return r ? new EventApi(this, r) : null;
  }
  addEvent(input) {
    const r = this.normalize(input);
    if (!r) return null;
    this.records.set(r.key, r);
    this.changed();
    const event = new EventApi(this, r);
    this.emit("eventAdd", {
      event,
      relatedEvents: [],
      revert: () => {
        this.records.delete(r.key);
        this.changed();
      },
    });
    return event;
  }
  change(previous, patch, callback) {
    const next = { ...previous, ...patch };
    // Recompute changed civil dates, but preserve exact unchanged endpoints.
    // setDates supplies explicit metadata; title/property edits leave it alone.
    for (const key of ["start", "end"]) {
      if (Object.hasOwn(patch, key) && !Object.hasOwn(patch, key + "Ms"))
        next[key + "Ms"] =
          next.allDay || !next[key]
            ? undefined
            : +next[key] === +previous[key]
              ? previous[key + "Ms"]
              : +this.env.toDate(next[key]);
    }
    this.records.set(previous.key, next);
    this.changed();
    const event = new EventApi(this, next),
      oldEvent = new EventApi(this, copy(previous), true),
      revert = () => {
        this.records.set(previous.key, previous);
        this.changed();
      };
    const info = { event, oldEvent, relatedEvents: [], revert };
    callback?.(info);
    this.emit("eventChange", info);
    return info;
  }
  remove(record) {
    if (!this.records.delete(record.key)) return;
    this.changed();
    this.emit("eventRemove", {
      event: new EventApi(this, copy(record), true),
      relatedEvents: [],
      revert: () => {
        this.records.set(record.key, record);
        this.changed();
      },
    });
  }
  removeAllEvents() {
    this.records.clear();
    this.changed();
  }
  select(input, end) {
    if (
      typeof input !== "object" ||
      input instanceof Date ||
      Array.isArray(input)
    )
      input = { start: input, end };
    const meta = this.env.createMarkerMeta(input.start);
    if (!meta) return;
    const allDay = input.allDay ?? meta.isTimeUnspecified,
      start = meta.marker,
      last = input.end
        ? marker(this.env, input.end)
        : new Date(+start + (allDay ? DAY : 3600000));
    if (+last <= +start) return;
    const info = {
      start: this.env.toDate(start),
      end: this.env.toDate(last),
      startStr: this.env.formatIso(start, { omitTime: allDay }),
      endStr: this.env.formatIso(last, { omitTime: allDay }),
      allDay,
      jsEvent: input.jsEvent ?? null,
      view: this.view,
    };
    if (this.options.selectAllow && !this.options.selectAllow(info)) return;
    this.selection = { start, end: last, allDay };
    this.changed();
    this.emit("select", info);
  }
  unselect(jsEvent = null) {
    if (!this.selection) return;
    this.selection = null;
    this.changed();
    this.emit("unselect", { jsEvent, view: this.view });
  }
  batchRendering(fn) {
    this.batch++;
    try {
      return fn();
    } finally {
      if (--this.batch === 0) this.notify();
    }
  }
  async refetchEvents() {
    const epoch = ++this.epoch,
      input = this.options.events,
      sources = this.options.eventSources || (input ? [input] : []);
    this.emit("loading", true);
    try {
      const info = this.datesInfo();
      const arrays = await Promise.all(
        sources.map((source) => {
          if (Array.isArray(source)) return source;
          const fn = typeof source === "function" ? source : source.events;
          if (typeof fn === "function")
            return new Promise((resolve, reject) => {
              try {
                const value = fn(info, resolve, reject);
                if (value?.then) value.then(resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          if (typeof source === "string") source = { url: source };
          if (Array.isArray(source.events)) return source.events;
          if (!source.url) return [];
          const extra =
            typeof source.extraParams === "function"
              ? source.extraParams()
              : source.extraParams;
          return requestJson(source.method || "GET", source.url, {
            ...extra,
            start: info.startStr,
            end: info.endStr,
            timeZone: info.timeZone,
          }).then(
            ([events]) => source.success?.(events) ?? events,
            (error) => {
              source.failure?.(error);
              throw error;
            },
          );
        }),
      );
      if (epoch !== this.epoch) return;
      this.replaceEvents(arrays.flat());
      this.inputEvents = input;
      this.changed();
    } catch (error) {
      if (epoch === this.epoch) this.emit("eventSourceFailure", error);
    } finally {
      if (epoch === this.epoch) this.emit("loading", false);
    }
  }
  destroy() {
    this.epoch++;
    this.notify = () => {};
  }
}
