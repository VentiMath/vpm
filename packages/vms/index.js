'use strict';

// Derived from ms 2.1.3, Copyright (c) 2020 Vercel, Inc.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const second = 1000;
const minute = second * 60;
const hour = minute * 60;
const day = hour * 24;
const duration = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i;

module.exports = ms;

function ms(value, options) {
  if (typeof value === 'string' && value.length > 0) {
    if (value.length > 100) return undefined;
    const match = duration.exec(value);
    if (!match) return undefined;
    const number = Number(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();
    // The regexp validates aliases; their initial letter identifies the scale.
    switch (unit[0]) {
      case 'y': return number * (day * 365.25);
      case 'w': return number * (day * 7);
      case 'd': return number * day;
      case 'h': return number * hour;
      case 's': return number * second;
      case 'm': return number * (unit === 'm' || unit.startsWith('min') ? minute : 1);
    }
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    // Do not serialize arbitrary invalid inputs or invoke user conversion hooks.
    throw new TypeError('value must be a non-empty string or a finite number');
  }
  return format(value, Boolean(options && options.long));
}

function format(value, verbose) {
  const magnitude = Math.abs(value);
  let scale, short, long;
  if (magnitude >= day) { scale = day; short = 'd'; long = 'day'; }
  else if (magnitude >= hour) { scale = hour; short = 'h'; long = 'hour'; }
  else if (magnitude >= minute) { scale = minute; short = 'm'; long = 'minute'; }
  else if (magnitude >= second) { scale = second; short = 's'; long = 'second'; }
  else return value + (verbose ? ' ms' : 'ms');

  const rounded = Math.round(magnitude / scale);
  const signed = value < 0 ? -rounded : rounded;
  return verbose
    ? signed + ' ' + long + (rounded === 1 ? '' : 's')
    : signed + short;
}
