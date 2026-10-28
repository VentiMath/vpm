'use strict';

// Derived from proxy-addr (MIT); see LICENSE and PROVENANCE.json.
const forwarded = require('vforwarded');
const { IPv4, IPv6 } = require('vipaddr');
const parse4 = IPv4.parser;
const parse6 = IPv6.parser;
const named = {
  loopback: ['127.0.0.0/8', '::1/128'],
  linklocal: ['169.254.0.0/16', 'fe80::/10'],
  uniquelocal: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7'],
};

module.exports = proxyaddr;
module.exports.all = all;
module.exports.compile = compile;
Object.freeze(module.exports);

function proxyaddr(request, trust) {
  if (request == null) throw new TypeError('req argument is required');
  if (trust == null) throw new TypeError('trust argument is required');
  const addresses = all(request, trust);
  return addresses[addresses.length - 1];
}

function all(request, trust) {
  if (request == null) throw new TypeError('req argument is required');
  const addresses = forwarded(request);
  if (trust == null) return addresses;
  if (typeof trust !== 'function') trust = compile(trust);
  // Keep the first untrusted hop, and never ask whether the furthest is trusted.
  for (let i = 0; i < addresses.length - 1; i++) {
    if (!trust(addresses[i], i)) { addresses.length = i + 1; break; }
  }
  return addresses;
}

function packed4(parts) {
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}
function mapped(parts) {
  return parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0xffff;
}
function matches4(value, ranges) {
  for (let i = 0; i < ranges.length; i += 2) if ((value & ranges[i]) === ranges[i + 1]) return true;
  return false;
}
function matches6(parts, ranges) {
  next: for (const range of ranges) {
    for (let i = 0; i < range.whole; i++) if (parts[i] !== range.parts[i]) continue next;
    if (range.shift === 16 || (parts[range.whole] >>> range.shift) === range.partial) return true;
  }
  return false;
}
function rangeError() { throw new TypeError('invalid range on address in trust configuration'); }

function prefix(text, max) {
  if (text.length === 0) return null;
  let bits = 0;
  for (let i = 0; i < text.length; i++) {
    const digit = text.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) return null;
    bits = bits * 10 + digit;
    if (bits > max) return null;
  }
  return bits;
}

function addRule(note, v4, v6) {
  const slash = note.indexOf('/');
  const address = slash === -1 ? note : note.slice(0, slash);
  const is6 = address.includes(':');
  const parsed = is6 ? parse6(address) : parse4(address);
  if (parsed === null) throw new TypeError('invalid IP address in trust configuration');
  const parts = is6 ? parsed.parts : parsed;
  let bits = is6 ? 128 : 32;
  if (slash !== -1) {
    const suffix = note.slice(slash + 1);
    bits = prefix(suffix, bits);
    if (bits === null && !is6 && (suffix.includes('.') || /^0x/i.test(suffix))) {
      // Netmasks are configuration, so using the public address helper here
      // keeps contiguity validation shared without adding per-hop objects.
      const mask = parse4(suffix);
      if (mask !== null) bits = new IPv4(mask).prefixLengthFromSubnetMask();
    }
    if (bits === null) return rangeError();
  }
  if (!is6 || mapped(parts)) {
    // A mapped prefix shorter than /96 does not cover the marker. Preserve
    // 2.0.8's safeguard: it grants no trust to either address family.
    if (is6) { if (bits < 96) return; bits -= 96; }
    const value = is6 ? (parts[6] << 16) | parts[7] : packed4(parts);
    const mask = bits === 0 ? 0 : -1 << (32 - bits);
    v4.push(mask, value & mask);
  } else {
    const whole = bits >>> 4;
    const shift = 16 - (bits & 15);
    v6.push({ parts, whole, shift, partial: shift === 16 ? 0 : parts[whole] >>> shift });
  }
}

function compile(value) {
  if (value == null) throw new TypeError('argument is required');
  const v4 = [], v6 = [];
  function add(note) {
    if (typeof note !== 'string') throw new TypeError('trust entries must be strings');
    if (Object.hasOwn(named, note)) {
      for (const subnet of named[note]) addRule(subnet, v4, v6);
    } else addRule(note, v4, v6);
  }
  if (typeof value === 'string') add(value);
  else if (Array.isArray(value)) {
    const length = value.length;
    if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) throw new TypeError('invalid trust array length');
    for (let i = 0; i < length; i++) {
      if (!Object.hasOwn(value, i)) throw new TypeError('trust entries must be own strings');
      add(value[i]);
    }
  } else throw new TypeError('unsupported trust argument');
  if (v4.length === 0 && v6.length === 0) return trustNone;
  return function trust(address) {
    if (typeof address !== 'string') return false;
    if (!address.includes(':')) {
      if (v4.length === 0) return false;
      const parts = parse4(address);
      return parts !== null && matches4(packed4(parts), v4);
    }
    const result = parse6(address);
    if (result === null) return false;
    const parts = result.parts;
    // Canonicalize mapped candidates without allocating another address.
    return mapped(parts)
      ? matches4((parts[6] << 16) | parts[7], v4)
      : matches6(parts, v6);
  };
}
function trustNone() { return false; }
