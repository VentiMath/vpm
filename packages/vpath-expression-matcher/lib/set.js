'use strict';
const {Expression, getSegments} = require('./expression.js');
function append(map, key, expression) { const bucket = map.get(key); if (bucket) bucket.push(expression); else map.set(key, [expression]); }
function search(bucket, matcher) { if (bucket) for (const expression of bucket) if (matcher.matches(expression)) return expression; return null; }
class ExpressionSet {
  #exact = new Map();
  #wildcard = new Map();
  #deep = new Map();
  #fallback = [];
  #patterns = new Map();
  #sealed = false;
  #size = 0;
  add(expression) {
    if (this.#sealed) throw new TypeError('ExpressionSet is sealed');
    if (!(expression instanceof Expression)) throw new TypeError('Expected an Expression');
    let patterns = this.#patterns.get(expression.separator);
    if (patterns?.has(expression.pattern)) return this;
    if (!patterns) this.#patterns.set(expression.separator, patterns = new Set());
    patterns.add(expression.pattern); this.#size++;
    const segments = getSegments(expression), last = segments[segments.length - 1];
    if (expression._hasDeepWildcard) {
      if (last.type === 'tag' && last.tag !== '*') append(this.#deep, last.tag, expression);
      else this.#fallback.push(expression);
    } else if (!last || last.tag === '*') append(this.#wildcard, expression.length, expression);
    else {
      let tags = this.#exact.get(expression.length);
      if (!tags) this.#exact.set(expression.length, tags = new Map());
      append(tags, last.tag, expression);
    }
    return this;
  }
  addAll(expressions) {
    if (this.#sealed) throw new TypeError('ExpressionSet is sealed');
    if (!Array.isArray(expressions)) throw new TypeError('Expected an array of Expressions');
    for (const expression of expressions) if (!(expression instanceof Expression)) throw new TypeError('Expected an array of Expressions');
    for (const expression of expressions) this.add(expression);
    return this;
  }
  has(expression) {
    if (!(expression instanceof Expression)) throw new TypeError('Expected an Expression');
    return this.#patterns.get(expression.separator)?.has(expression.pattern) || false;
  }
  get size() { return this.#size; }
  get isSealed() { return this.#sealed; }
  seal() { this.#sealed = true; return this; }
  matchesAny(matcher) { return this.findMatch(matcher) !== null; }
  findMatch(matcher) {
    const depth = matcher.getDepth(), tag = matcher.getCurrentTag();
    return search(this.#exact.get(depth)?.get(tag), matcher) || search(this.#wildcard.get(depth), matcher) || search(this.#deep.get(tag), matcher) || search(this.#fallback, matcher);
  }
}
exports.ExpressionSet = ExpressionSet;
