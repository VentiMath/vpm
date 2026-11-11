"use strict";
const factors = {
  millisecond: 1,
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000,
  week: 604800000,
};
const aliases = {
  ms: "millisecond",
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "week",
};
function unit(value = "millisecond") {
  if (typeof value !== "string")
    throw new TypeError("A duration unit is required");
  const key = aliases[value] ?? value.toLowerCase().replace(/s$/, "");
  if (!Object.hasOwn(factors, key))
    throw new RangeError("Unsupported countdown unit: " + value);
  return key;
}
function zero(value) {
  return value === 0 ? 0 : value;
}
function parseISO(text) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/.exec(
      text,
    );
  if (!match) return NaN;
  const [, ys, ms, ds, hs, mins, secs, frac, zone] = match,
    y = +ys,
    m = +ms,
    d = +ds,
    h = +(hs ?? 0),
    minute = +(mins ?? 0),
    second = +(secs ?? 0),
    millisecond = +(frac ?? "").padEnd(3, "0").slice(0, 3);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0),
    days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > days[m - 1] ||
    h > 24 ||
    minute > 59 ||
    second > 59 ||
    (h === 24 && (minute || second || millisecond))
  )
    return NaN;
  const date = new Date(0);
  if (zone) {
    let offset = 0;
    if (zone !== "Z") {
      const z = zone.slice(1).replace(":", ""),
        hours = +z.slice(0, 2),
        minutes = +(z.slice(2) || 0);
      if (hours > 23 || minutes > 59) return NaN;
      offset = (hours * 60 + minutes) * (zone[0] === "-" ? -1 : 1);
    }
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(h, minute, second, millisecond);
    return date.getTime() - offset * 60000;
  }
  date.setFullYear(y, m - 1, d);
  date.setHours(h, minute, second, millisecond);
  return date.getTime();
}
function isMoment(value) {
  return (
    !!value &&
    value._isAMomentObject === true &&
    typeof value.valueOf === "function"
  );
}
function timestamp(input) {
  if (input === undefined) return moment.now();
  if (typeof input === "number") return input;
  if (typeof input === "string") return parseISO(input);
  if (input instanceof MomentValue) return input.valueOf();
  if (isMoment(input)) return Number(input.valueOf());
  if (input && typeof input === "object") {
    try {
      return Date.prototype.getTime.call(input);
    } catch {}
  }
  return NaN;
}
class MomentValue {
  #date;
  constructor(input) {
    this.#date = new Date(timestamp(input));
  }
  get _isAMomentObject() {
    return true;
  }
  valueOf() {
    return this.#date.getTime();
  }
  isValid() {
    return Number.isFinite(this.valueOf());
  }
  toDate() {
    return new Date(this.valueOf());
  }
  toISOString() {
    return this.isValid() ? this.#date.toISOString() : null;
  }
  toJSON() {
    return this.toISOString();
  }
  clone() {
    return new MomentValue(this.valueOf());
  }
  add(amount, inputUnit) {
    const name = unit(inputUnit);
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      this.#date = new Date(NaN);
      return this;
    }
    if (name === "day" || name === "week") {
      const days = amount * (name === "week" ? 7 : 1),
        rounded = Math.sign(days) * Math.round(Math.abs(days));
      if (!rounded) return this;
      this.#date.setDate(this.#date.getDate() + rounded);
    } else this.#date.setTime(this.valueOf() + amount * factors[name]);
    return this;
  }
  diff(input, inputUnit, asFloat = false) {
    const name = unit(inputUnit),
      other = new Date(timestamp(input));
    let difference = this.valueOf() - other.getTime();
    if (name === "day" || name === "week")
      difference -=
        (this.#date.getTimezoneOffset() - other.getTimezoneOffset()) * 60000;
    const value = difference / factors[name];
    return asFloat ? zero(value) : zero(Math.trunc(value));
  }
}
class Duration {
  #milliseconds;
  constructor(amount, inputUnit) {
    const factor = factors[unit(inputUnit)];
    this.#milliseconds =
      typeof amount === "number" && Number.isFinite(amount * factor)
        ? amount * factor
        : NaN;
  }
  isValid() {
    return Number.isFinite(this.#milliseconds);
  }
  asMilliseconds() {
    return this.#milliseconds;
  }
  asSeconds() {
    return this.#milliseconds / 1000;
  }
  asMinutes() {
    return this.#milliseconds / 60000;
  }
  asHours() {
    return this.#milliseconds / 3600000;
  }
  asDays() {
    return this.#milliseconds / 86400000;
  }
  asWeeks() {
    return this.#milliseconds / 604800000;
  }
  milliseconds() {
    return this.#milliseconds % 1000;
  }
  seconds() {
    return zero(Math.trunc(this.#milliseconds / 1000)) % 60;
  }
  minutes() {
    return zero(Math.trunc(this.#milliseconds / 60000)) % 60;
  }
  hours() {
    return zero(Math.trunc(this.#milliseconds / 3600000)) % 24;
  }
}
function moment(input) {
  return new MomentValue(input);
}
moment.now = () => Date.now();
moment.isMoment = isMoment;
moment.duration = (amount, inputUnit) => new Duration(amount, inputUnit);
moment.fn = MomentValue.prototype;
module.exports = moment;
module.exports.default = moment;
