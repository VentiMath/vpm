'use strict';

let getSegments;
function separatorOf(options) {
  if (options === undefined) return '.';
  if (!options || typeof options !== 'object') throw new TypeError('Options must be an object');
  const value = options.separator === undefined ? '.' : options.separator;
  if (typeof value !== 'string' || !value.length || /[\[\]:]/.test(value)) throw new TypeError('separator must be a nonempty string without brackets or colons');
  return value;
}
function parseSegment(part) {
  const segment = {type: 'tag'};
  const open = part.indexOf('[');
  if (open >= 0) {
    const close = part.indexOf(']', open + 1);
    if (open === 0 || close < 0 || part.indexOf('[', open + 1) >= 0 || part.indexOf(']', close + 1) >= 0) throw new SyntaxError('Invalid attribute condition');
    const content = part.slice(open + 1, close), equal = content.indexOf('=');
    segment.attrName = (equal < 0 ? content : content.slice(0, equal)).trim();
    if (!segment.attrName) throw new SyntaxError('Attribute name must not be empty');
    if (equal >= 0) segment.attrValue = content.slice(equal + 1).trim();
    const tail = part.slice(close + 1).trim();
    if (tail && !tail.startsWith(':')) throw new SyntaxError('Unexpected text after attribute condition');
    part = part.slice(0, open).trim() + tail;
  } else if (part.includes(']')) throw new SyntaxError('Unexpected closing bracket');
  const namespace = part.indexOf('::');
  if (namespace >= 0) {
    segment.namespace = part.slice(0, namespace).trim();
    part = part.slice(namespace + 2).trim();
    if (!segment.namespace || part.includes('::')) throw new SyntaxError('Invalid namespace in pattern');
  }
  const colon = part.lastIndexOf(':');
  if (colon >= 0) {
    const position = part.slice(colon + 1).trim();
    if (position === 'last') throw new SyntaxError(':last requires future sibling information and is unsupported');
    if (position === 'first' || position === 'odd' || position === 'even') {
      segment.position = position; part = part.slice(0, colon).trim();
    } else if (position.startsWith('nth(')) {
      if (!/^nth\(\d+\)$/.test(position)) throw new SyntaxError('Invalid nth selector');
      const value = Number(position.slice(4, -1));
      if (!Number.isSafeInteger(value)) throw new SyntaxError('nth index must be a safe integer');
      segment.position = 'nth'; segment.positionValue = value; part = part.slice(0, colon).trim();
    }
  }
  if (!part) throw new SyntaxError('Invalid segment pattern');
  segment.tag = part;
  return segment;
}
function parse(pattern, separator) {
  // Most XML stop paths have no selectors. Native splitting avoids scanning
  // each character while preserving the full parser for wildcard/predicate paths.
  if (!/[\[\]:]/.test(pattern) && !pattern.includes(separator + separator)) {
    return pattern.split(separator).map(tag => tag.trim()).filter(Boolean).map(tag => ({type: 'tag', tag}));
  }
  const segments = [], width = separator.length;
  let start = 0, bracket = false;
  const append = end => { const part = pattern.slice(start, end).trim(); if (part) segments.push(parseSegment(part)); };
  for (let i = 0; i < pattern.length;) {
    const c = pattern.charCodeAt(i);
    if (c === 91) { if (bracket) throw new SyntaxError('Nested attribute condition'); bracket = true; i++; }
    else if (c === 93) { if (!bracket) throw new SyntaxError('Unexpected closing bracket'); bracket = false; i++; }
    else if (!bracket && pattern.startsWith(separator, i)) {
      append(i); i += width;
      if (pattern.startsWith(separator, i)) { segments.push({type: 'deep-wildcard'}); i += width; }
      start = i;
    } else i++;
  }
  if (bracket) throw new SyntaxError('Unclosed attribute condition');
  append(pattern.length);
  return segments;
}
class Expression {
  #data;
  #segments;
  #inspection;
  static { getSegments = expression => expression.#segments; }
  constructor(pattern, options, data) {
    if (typeof pattern !== 'string') throw new TypeError('Pattern must be a string');
    this.pattern = pattern; this.separator = separatorOf(options);
    const segments = parse(pattern, this.separator);
    this.#segments = segments; this.#data = data;
    this._hasDeepWildcard = false; this._hasAttributeCondition = false; this._hasPositionSelector = false;
    let index = 0, deepCount = 0, deepIndex = -1;
    for (const segment of segments) {
      if (segment.type === 'deep-wildcard') { this._hasDeepWildcard = true; deepCount++; deepIndex = index; }
      if (segment.attrName !== undefined) this._hasAttributeCondition = true;
      if (segment.position !== undefined) this._hasPositionSelector = true;
      index++;
    }
    this._singleDeepIndex = deepCount === 1 ? deepIndex : -1;
    Object.freeze(this);
  }
  get segments() {
    return this.#inspection || (this.#inspection = Object.freeze(this.#segments.map(segment => Object.freeze({...segment}))));
  }
  get data() { return this.#data; }
  set data(value) { this.#data = value; }
  get length() { return this.#segments.length; }
  hasDeepWildcard() { return this._hasDeepWildcard; }
  hasAttributeCondition() { return this._hasAttributeCondition; }
  hasPositionSelector() { return this._hasPositionSelector; }
  toString() { return this.pattern; }
}
exports.Expression = Expression;
exports.separatorOf = separatorOf;
exports.getSegments = getSegments;
