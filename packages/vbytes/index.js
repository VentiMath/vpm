'use strict';

const syntax = /^([+-]?)(\d+)(?:\.(\d+))?(?: *(b|kb|mb|gb|tb|pb))?(?![\s\S])/i;
const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
const factors = [1, 1024, 1048576, 1073741824, 1099511627776, 1125899906842624];
const maximum = Number.MAX_SAFE_INTEGER;

function bytes(value, options) {
  if (typeof value === 'number') return format(value, options);
  if (typeof value === 'string') return parse(value);
  return null;
}

function parse(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > maximum) throw new RangeError('byte size must be finite and within the safe numeric range');
    return value;
  }
  if (typeof value !== 'string') throw new TypeError('byte size must be a string or number');
  return parseString(value);
}

function parseString(value) {
  // Only outer ASCII spaces are ignored. Line breaks and tabs are not syntax.
  let start = 0, end = value.length;
  while (value.charCodeAt(start) === 32) start++;
  while (end > start && value.charCodeAt(end - 1) === 32) end--;
  const match = syntax.exec(value.slice(start, end));
  if (!match) throw new TypeError('invalid byte size');
  const index = match[4] === undefined ? 0 : units.indexOf(match[4].toUpperCase());
  const factor = factors[index];
  let magnitude = Number(match[2]) * factor;
  if (!Number.isSafeInteger(magnitude)) throw new RangeError('byte size exceeds the safe integer range');
  const fraction = match[3];
  if (fraction !== undefined) {
    // A multiple of 1 / 2**n has at most n decimal places. Later digits can
    // change whether a remainder exists, but cannot change its integer part.
    // Bound BigInt work to 50 decimal digits even for arbitrarily long input.
    const head = fraction.slice(0, index * 10);
    let partial = 0, remainder = false;
    if (head.length) {
      const product = Number(head) * factor;
      if (head.length <= 15 && Number.isSafeInteger(product)) {
        const divisor = 10 ** head.length;
        partial = Math.floor(product / divisor);
        remainder = product % divisor !== 0;
      } else {
        const numerator = BigInt(head) * BigInt(factor);
        const divisor = 10n ** BigInt(head.length);
        partial = Number(numerator / divisor);
        remainder = numerator % divisor !== 0n;
      }
    }
    magnitude += partial;
    if (match[1] === '-' && (remainder || /[1-9]/.test(fraction.slice(head.length)))) magnitude++;
    if (!Number.isSafeInteger(magnitude)) throw new RangeError('byte size exceeds the safe integer range');
  }
  return match[1] === '-' ? -magnitude : magnitude;
}

function own(options, name) {
  return options && Object.hasOwn(options, name) ? options[name] : undefined;
}

function format(value, options) {
  if (!Number.isFinite(value)) return null;
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object');
  const decimals = own(options, 'decimalPlaces') ?? 2;
  const fixed = own(options, 'fixedDecimals') ?? false;
  const thousands = own(options, 'thousandsSeparator') ?? '';
  const separator = own(options, 'unitSeparator') ?? '';
  let unit = own(options, 'unit') ?? '';
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 100) throw new RangeError('decimalPlaces must be an integer from 0 to 100');
  if (typeof fixed !== 'boolean') throw new TypeError('fixedDecimals must be a boolean');
  if (typeof thousands !== 'string' || typeof separator !== 'string') throw new TypeError('separators must be strings');
  if (typeof unit !== 'string') throw new TypeError('unit must be a string');
  let index;
  if (unit === '') {
    index = factors.length - 1;
    while (index > 0 && Math.abs(value) < factors[index]) index--;
    unit = units[index];
  } else {
    index = units.indexOf(unit.toUpperCase());
    if (index === -1) throw new TypeError('unknown byte unit');
  }
  let result = (value / factors[index]).toFixed(decimals);
  if (!fixed && result.includes('.') && !result.includes('e')) {
    let end = result.length;
    while (result.charCodeAt(end - 1) === 48) end--;
    if (result.charCodeAt(end - 1) === 46) end--;
    result = result.slice(0, end);
  }
  if (thousands && !result.includes('e')) {
    const decimal = result.indexOf('.');
    const end = decimal === -1 ? result.length : decimal;
    const sign = result.charCodeAt(0) === 45 ? 1 : 0;
    let grouped = result.slice(0, sign), position = sign;
    for (let next = sign + ((end - sign) % 3 || 3); next < end; next += 3) {
      grouped += result.slice(position, next) + thousands;
      position = next;
    }
    result = grouped + result.slice(position);
  }
  return result + separator + unit;
}

module.exports = bytes;
module.exports.parse = parse;
module.exports.format = format;
Object.freeze(bytes);
