"use strict";
// Positions are gaps between document tokens. Four independent flags describe
// which neighboring tokens disappeared, and whether the chosen side was lost.
class MapResult {
  constructor(pos, delInfo = 0, recover = null) {
    this.pos = pos;
    this.delInfo = delInfo;
    this.recover = recover;
  }
  get deleted() {
    return !!(this.delInfo & 8);
  }
  get deletedBefore() {
    return !!(this.delInfo & 5);
  }
  get deletedAfter() {
    return !!(this.delInfo & 6);
  }
  get deletedAcross() {
    return !!(this.delInfo & 4);
  }
}
class StepMap {
  constructor(ranges, inverted = false) {
    this.ranges = ranges;
    this.inverted = inverted;
  }
  map(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, true);
  }
  _map(pos, assoc, result) {
    let shift = 0;
    for (let i = 0; i < this.ranges.length; i += 3) {
      const raw = this.ranges[i],
        removed = this.ranges[i + (this.inverted ? 2 : 1)],
        added = this.ranges[i + (this.inverted ? 1 : 2)],
        start = raw - (this.inverted ? shift : 0),
        end = start + removed;
      if (pos < start) break;
      if (pos <= end) {
        const side =
          removed === 0 ? assoc : pos === start ? -1 : pos === end ? 1 : assoc;
        const value = start + shift + (side < 0 ? 0 : added);
        if (!result) return value;
        const flags =
          removed === 0 ? 0 : pos === start ? 2 : pos === end ? 1 : 4;
        const lost = removed !== 0 && (assoc < 0 ? pos !== start : pos !== end);
        // Recovery values encode the range and exact interior offset. They
        // belong to a mirrored pair and are never a public document position.
        const recovery =
          pos === (assoc < 0 ? start : end)
            ? null
            : i / 3 + (pos - start) * 65536;
        return new MapResult(value, flags | (lost ? 8 : 0), recovery);
      }
      shift += added - removed;
    }
    return result ? new MapResult(pos + shift) : pos + shift;
  }
  recover(value) {
    const index = value % 65536,
      offset = (value - index) / 65536;
    let shift = 0;
    if (!this.inverted)
      for (let i = 0; i < index * 3; i += 3)
        shift += this.ranges[i + 2] - this.ranges[i + 1];
    return this.ranges[index * 3] + shift + offset;
  }
  touches(pos, value) {
    const index = value % 65536;
    let found = false;
    this.forEach((a, b, _c, _d, i) => {
      if (i === index && pos >= a && pos <= b) found = true;
    });
    return found;
  }
  forEach(fn) {
    let shift = 0;
    for (let i = 0; i < this.ranges.length; i += 3) {
      const old = this.ranges[i + 1],
        size = this.ranges[i + 2],
        start = this.ranges[i],
        a = start - (this.inverted ? shift : 0),
        b = start + (this.inverted ? 0 : shift);
      fn(
        a,
        a + (this.inverted ? size : old),
        b,
        b + (this.inverted ? old : size),
        i / 3,
      );
      shift += size - old;
    }
  }
  invert() {
    return new StepMap(this.ranges, !this.inverted);
  }
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  static offset(n) {
    return n === 0
      ? StepMap.empty
      : new StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
  }
}
StepMap.empty = new StepMap([]);
class Mapping {
  constructor(maps = [], mirror, from = 0, to = maps.length) {
    this._maps = maps;
    this.mirror = mirror;
    this.from = from;
    this.to = to;
    this._shared = true;
  }
  get maps() {
    return this._maps;
  }
  slice(from = 0, to = this.maps.length) {
    this._shared = true;
    return new Mapping(this.maps, this.mirror, from, to);
  }
  copy() {
    return new Mapping(
      this.maps.slice(),
      this.mirror?.slice(),
      this.from,
      this.to,
    );
  }
  appendMap(map, mirrors) {
    if (this._shared) {
      this._maps = this.maps.slice();
      this.mirror = this.mirror?.slice();
      this._shared = false;
    }
    this._maps.push(map);
    this.to = this.maps.length;
    if (mirrors != null) this.setMirror(this.maps.length - 1, mirrors);
  }
  getMirror(n) {
    const i = this.mirror?.indexOf(n) ?? -1;
    return i < 0 ? undefined : this.mirror[i ^ 1];
  }
  setMirror(a, b) {
    if (this._shared) {
      this.mirror = this.mirror?.slice();
      this._maps = this.maps.slice();
      this._shared = false;
    }
    (this.mirror ??= []).push(a, b);
  }
  appendMapping(other) {
    const offset = this.maps.length;
    for (let i = 0; i < other.maps.length; i++) {
      const m = other.getMirror(i);
      this.appendMap(
        other.maps[i],
        m != null && m < i ? offset + m : undefined,
      );
    }
  }
  appendMappingInverted(other) {
    const offset = this.maps.length + other.maps.length - 1;
    for (let i = other.maps.length - 1; i >= 0; i--) {
      const m = other.getMirror(i);
      this.appendMap(
        other.maps[i].invert(),
        m != null && m > i ? offset - m : undefined,
      );
    }
  }
  invert() {
    const out = new Mapping();
    out.appendMappingInverted(this);
    return out;
  }
  map(pos, assoc = 1) {
    if (!this.mirror) {
      for (let i = this.from; i < this.to; i++)
        pos = this.maps[i].map(pos, assoc);
      return pos;
    }
    return this.mapResult(pos, assoc).pos;
  }
  mapResult(pos, assoc = 1) {
    let flags = 0;
    for (let i = this.from; i < this.to; i++) {
      const r = this.maps[i].mapResult(pos, assoc),
        mirror = this.getMirror(i);
      if (
        r.recover != null &&
        mirror != null &&
        mirror > i &&
        mirror < this.to
      ) {
        pos = this.maps[mirror].recover(r.recover);
        i = mirror;
      } else {
        flags |= r.delInfo;
        pos = r.pos;
      }
    }
    return new MapResult(pos, flags);
  }
}
module.exports = { MapResult, StepMap, Mapping };
