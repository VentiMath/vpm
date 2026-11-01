"use strict";
// VPM app-option snapshots. Credentials/agents with their own class retain
// identity; plain records and arrays are detached without invoking __proto__.
function snapshotOptions(source, cycleMessage = 'App options must not contain cycles.') {
  const frames = [];
  let copies, active;
  function copy(value) {
    if (!value || typeof value !== 'object') return value;
    const proto = Object.getPrototypeOf(value);
    if (proto === Date.prototype) return new Date(value.getTime());
    if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return value;
    if (!copies && frames.length) {
      copies = new WeakMap(frames.map(frame => [frame.source, frame.target]));
      active = new Set(frames.map(frame => frame.source));
    }
    if (active?.has(value)) throw new TypeError(cycleMessage);
    if (copies?.has(value)) return copies.get(value);
    const target = Array.isArray(value) ? new Array(value.length) : Object.create(proto);
    copies?.set(value, target); active?.add(value);
    frames.push({source: value, target, keys: Object.keys(value), index: 0});
    return target;
  }
  const result = copy(source);
  while (frames.length) {
    const frame = frames[frames.length - 1];
    if (frame.index === frame.keys.length) {active?.delete(frame.source); frames.pop(); continue;}
    const key = frame.keys[frame.index++], value = copy(frame.source[key]);
    // New own keys need no descriptor allocation. Inherited names take the
    // defining path so no inherited setter, including __proto__, can execute.
    if (key in frame.target) Object.defineProperty(frame.target, key, {value, writable: true, enumerable: true, configurable: true});
    else frame.target[key] = value;
  }
  return result;
}
exports.snapshotOptions = snapshotOptions;

// Compare detached configuration records without a recursive call-stack limit
// or custom valueOf/toString execution. Opaque objects compare by identity.
function equalOptions(left, right) {
  const pending = [[left, right]], compared = new WeakMap();
  while (pending.length) {
    const [a, b] = pending.pop();
    if (a === b || (Number.isNaN(a) && Number.isNaN(b))) continue;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== Object.getPrototypeOf(b)) return false;
    if (proto === Date.prototype) {if (a.getTime() !== b.getTime()) return false; continue;}
    if (Array.isArray(a)) {if (a.length !== b.length) return false;}
    else if (proto !== null && proto !== Object.prototype) return false;
    let partners = compared.get(a);
    if (partners?.has(b)) continue;
    if (!partners) compared.set(a, partners = new WeakSet());
    partners.add(b);
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (!Object.hasOwn(b, key)) return false;
      pending.push([a[key], b[key]]);
    }
  }
  return true;
}
exports.equalOptions = equalOptions;
