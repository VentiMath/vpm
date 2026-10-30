'use strict';
const {separatorOf, getSegments} = require('./expression.js');
const own = Object.hasOwn;
function attributes(value) {
  if (value != null && (typeof value !== 'object' || Array.isArray(value))) throw new TypeError('Attributes must be a record or null');
}
function copyValues(value) {
  if (value === undefined) return undefined;
  const copy = Object.create(null);
  for (const key of Object.getOwnPropertyNames(value)) copy[key] = value[key];
  return copy;
}
function copyNode(node) {
  const result = {tag: node.tag, position: node.position, counter: node.counter};
  if (node.namespace !== undefined) result.namespace = node.namespace;
  if (node.values !== undefined) result.values = copyValues(node.values);
  return result;
}
function copyLevel(level) {
  const result = {counts: new Map(level.counts), total: level.total};
  if (level.namespaceCounts) result.namespaceCounts = new Map([...level.namespaceCounts].map(([key, counts]) => [key, new Map(counts)]));
  return result;
}
function segmentMatches(segment, node, current) {
  if (segment.tag !== '*' && segment.tag !== node.tag) return false;
  if (segment.namespace !== undefined && segment.namespace !== '*' && segment.namespace !== node.namespace) return false;
  if (segment.attrName !== undefined) {
    if (!current || !node.values || !own(node.values, segment.attrName)) return false;
    if (segment.attrValue !== undefined && String(node.values[segment.attrName]) !== segment.attrValue) return false;
  }
  if (segment.position !== undefined) {
    if (!current) return false;
    const counter = node.counter;
    switch (segment.position) {
      case 'first': return counter === 0;
      case 'odd': return counter % 2 === 1;
      case 'even': return counter % 2 === 0;
      case 'nth': return counter === segment.positionValue;
    }
  }
  return true;
}
function safeIndex(n) { return Number.isSafeInteger(n) && n >= 0; }
function validateCounts(counts) {
  if (!(counts instanceof Map)) throw new TypeError('Snapshot counts must be Maps');
  for (const [key, value] of counts) if (typeof key !== 'string' || !safeIndex(value)) throw new TypeError('Invalid snapshot count');
}
class Matcher {
  #path = [];
  #levels = [];
  #kept = [];
  #cache = null;
  #view;
  #separator;
  constructor(options) { this.#separator = separatorOf(options); }
  get separator() { return this.#separator; }
  // Inspection returns copies. Mutating these cannot corrupt counters/caches.
  get path() { return this.#path.map(copyNode); }
  get siblingStacks() { return this.#levels.map(copyLevel); }
  push(tag, values = null, namespace = null, options = null) {
    if (typeof tag !== 'string') throw new TypeError('Tag must be a string');
    if (namespace != null && typeof namespace !== 'string') throw new TypeError('Namespace must be a string or null');
    attributes(values);
    if (options !== null && typeof options !== 'object') throw new TypeError('Push options must be an object');
    const keep = options?.keep;
    if (keep != null) {
      if (!Array.isArray(keep)) throw new TypeError('keep must be an array of strings');
      for (const name of keep) if (typeof name !== 'string') throw new TypeError('keep must be an array of strings');
    }
    const depth = this.#path.length;
    // Read kept values before changing state, so a throwing getter cannot leave
    // a half-pushed path. Missing and inherited attributes are never retained.
    let kept;
    if (keep?.length && values) {
      kept = [];
      for (const name of keep) if (own(values, name)) kept.push({depth: depth + 1, name, value: values[name]});
    }
    let level = this.#levels[depth];
    if (!level) this.#levels[depth] = level = {counts: new Map(), total: 0};
    let counts = level.counts;
    if (namespace) {
      const namespaces = level.namespaceCounts || (level.namespaceCounts = new Map());
      counts = namespaces.get(namespace);
      if (!counts) namespaces.set(namespace, counts = new Map());
    }
    const counter = counts.get(tag) || 0;
    const node = {tag, position: level.total, counter, values: values == null ? undefined : values, namespace: namespace == null ? undefined : namespace};
    counts.set(tag, counter + 1); level.total++;
    if (depth) this.#path[depth - 1].values = undefined;
    this.#path.push(node); this.#cache = null;
    if (kept) for (const entry of kept) this.#kept.push(entry);
  }
  pop() {
    if (!this.#path.length) return undefined;
    const node = this.#path.pop(); this.#cache = null;
    if (this.#levels.length > this.#path.length + 1) this.#levels.length = this.#path.length + 1;
    while (this.#kept.length && this.#kept[this.#kept.length - 1].depth > this.#path.length) this.#kept.pop();
    return node;
  }
  updateCurrent(values) { attributes(values); if (this.#path.length && values != null) this.#path[this.#path.length - 1].values = values; }
  getCurrentTag() { return this.#path[this.#path.length - 1]?.tag; }
  getCurrentNamespace() { return this.#path[this.#path.length - 1]?.namespace; }
  getAttrValue(name) { const values = this.#path[this.#path.length - 1]?.values; return values && own(values, name) ? values[name] : undefined; }
  hasAttr(name) { const values = this.#path[this.#path.length - 1]?.values; return !!values && own(values, name); }
  getAnyParentAttr(name) { for (let i = this.#kept.length - 1; i >= 0; i--) if (this.#kept[i].name === name) return this.#kept[i].value; }
  hasAnyParentAttr(name) { for (let i = this.#kept.length - 1; i >= 0; i--) if (this.#kept[i].name === name) return true; return false; }
  getPosition() { return this.#path[this.#path.length - 1]?.position ?? -1; }
  getCounter() { return this.#path[this.#path.length - 1]?.counter ?? -1; }
  getIndex() { return this.getPosition(); }
  getDepth() { return this.#path.length; }
  toString(separator = this.separator, includeNamespace = true) {
    if (typeof separator !== 'string') throw new TypeError('separator must be a string');
    const cached = separator === this.separator && includeNamespace === true;
    if (cached && this.#cache !== null) return this.#cache;
    let result = '';
    for (let i = 0; i < this.#path.length; i++) {
      const node = this.#path[i];
      if (i) result += separator;
      if (includeNamespace && node.namespace) result += node.namespace + ':';
      result += node.tag;
    }
    if (cached) this.#cache = result;
    return result;
  }
  toArray() { return this.#path.map(node => node.tag); }
  reset() { this.#path.length = 0; this.#levels.length = 0; this.#kept.length = 0; this.#cache = null; }
  matches(expression) {
    const segments = getSegments(expression), path = this.#path;
    if (!segments.length) return false;
    if (!expression._hasDeepWildcard) {
      if (segments.length !== path.length) return false;
      for (let i = 0; i < segments.length; i++) if (!segmentMatches(segments[i], path[i], i === path.length - 1)) return false;
      return true;
    }
    // One deep wildcard has a unique prefix/suffix alignment; no search is
    // necessary. Keep this common XML stop-path case out of the general loop.
    const deep = expression._singleDeepIndex;
    if (deep >= 0) {
      if (path.length < segments.length - 1) return false;
      for (let i = 0; i < deep; i++) if (!segmentMatches(segments[i], path[i], i === path.length - 1)) return false;
      for (let i = segments.length - 1, p = path.length - 1; i > deep; i--, p--) if (!segmentMatches(segments[i], path[p], p === path.length - 1)) return false;
      return true;
    }
    // Match fixed suffixes from the end first. This handles the common
    // root..leaf form without scanning intermediate names, and cannot consume
    // a required prefix because each remaining segment still matches in order.
    let end = path.length, segmentEnd = segments.length;
    while (segmentEnd && segments[segmentEnd - 1].type !== 'deep-wildcard') {
      if (!end || !segmentMatches(segments[segmentEnd - 1], path[end - 1], end === path.length)) return false;
      end--; segmentEnd--;
    }
    // Iterative glob matching: retry the most recent deep wildcard on a
    // mismatch. No recursion or exponential search over wildcard partitions.
    let p = 0, s = 0, star = -1, retry = 0;
    while (p < end) {
      if (s < segmentEnd && segments[s].type === 'deep-wildcard') { star = s++; retry = p; if (s === segmentEnd) return true; }
      else if (s < segmentEnd && segmentMatches(segments[s], path[p], p === path.length - 1)) { p++; s++; }
      else if (star >= 0) { p = ++retry; s = star + 1; }
      else return false;
    }
    while (s < segmentEnd && segments[s].type === 'deep-wildcard') s++;
    return s === segmentEnd;
  }
  matchesAny(set) { return set.matchesAny(this); }
  snapshot() { return {path: this.#path.map(copyNode), siblingStacks: this.#levels.map(copyLevel), keptAttrs: this.#kept.map(entry => ({...entry}))}; }
  restore(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.path) || !Array.isArray(snapshot.siblingStacks) || (snapshot.keptAttrs !== undefined && !Array.isArray(snapshot.keptAttrs))) throw new TypeError('Invalid matcher snapshot');
    const path = Array.from(snapshot.path, node => {
      if (!node || typeof node.tag !== 'string' || !safeIndex(node.position) || !safeIndex(node.counter) || (node.namespace !== undefined && typeof node.namespace !== 'string')) throw new TypeError('Invalid snapshot node');
      attributes(node.values); return copyNode(node);
    });
    const levels = Array.from(snapshot.siblingStacks, level => {
      if (!level || !safeIndex(level.total)) throw new TypeError('Invalid snapshot level');
      validateCounts(level.counts);
      if (level.namespaceCounts !== undefined) {
        if (!(level.namespaceCounts instanceof Map)) throw new TypeError('Invalid namespace counts');
        for (const [namespace, counts] of level.namespaceCounts) { if (typeof namespace !== 'string') throw new TypeError('Invalid namespace'); validateCounts(counts); }
      }
      return copyLevel(level);
    });
    if (levels.length < path.length || levels.length > path.length + 1) throw new TypeError('Invalid snapshot depth');
    let previous = 0;
    const kept = Array.from(snapshot.keptAttrs || [], entry => {
      if (!entry || !safeIndex(entry.depth) || entry.depth < 1 || entry.depth < previous || entry.depth > path.length || typeof entry.name !== 'string') throw new TypeError('Invalid kept attribute');
      previous = entry.depth; return {...entry};
    });
    this.#path = path; this.#levels = levels; this.#kept = kept; this.#cache = null;
  }
  readOnly() { return this.#view || (this.#view = new MatcherView(this)); }
}
class MatcherView {
  #matcher;
  constructor(matcher) {
    if (!(matcher instanceof Matcher)) throw new TypeError('Expected a Matcher');
    this.#matcher = matcher; this.separator = matcher.separator; Object.freeze(this);
  }
  get path() {
    return Object.freeze(this.#matcher.path.map(node => { if (node.values) Object.freeze(node.values); return Object.freeze(node); }));
  }
  getCurrentTag() { return this.#matcher.getCurrentTag(); }
  getCurrentNamespace() { return this.#matcher.getCurrentNamespace(); }
  getAttrValue(name) { return this.#matcher.getAttrValue(name); }
  hasAttr(name) { return this.#matcher.hasAttr(name); }
  getAnyParentAttr(name) { return this.#matcher.getAnyParentAttr(name); }
  hasAnyParentAttr(name) { return this.#matcher.hasAnyParentAttr(name); }
  getPosition() { return this.#matcher.getPosition(); }
  getCounter() { return this.#matcher.getCounter(); }
  getIndex() { return this.#matcher.getIndex(); }
  getDepth() { return this.#matcher.getDepth(); }
  toString(separator, includeNamespace) { return this.#matcher.toString(separator, includeNamespace); }
  toArray() { return this.#matcher.toArray(); }
  matches(expression) { return this.#matcher.matches(expression); }
  matchesAny(set) { return set.matchesAny(this); }
  snapshot() { return this.#matcher.snapshot(); }
}
exports.Matcher = Matcher;
exports.MatcherView = MatcherView;
