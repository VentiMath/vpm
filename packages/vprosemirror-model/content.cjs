"use strict";
const { Fragment } = require("./core.cjs");
class ContentMatch {
  constructor(validEnd = false) {
    this.validEnd = validEnd;
    this.next = [];
    this.wrapCache = new Map();
  }
  matchType(type) {
    for (const edge of this.next) if (edge.type === type) return edge.next;
    return null;
  }
  matchFragment(fragment, start = 0, end = fragment.childCount) {
    let state = this;
    for (let i = start; state && i < end; i++)
      state = state.matchType(fragment.child(i).type);
    return state;
  }
  get inlineContent() {
    return !!this.next[0]?.type.isInline;
  }
  get defaultType() {
    return (
      this.next.find((e) => !e.type.isText && !e.type.hasRequiredAttrs())
        ?.type || null
    );
  }
  get edgeCount() {
    return this.next.length;
  }
  edge(i) {
    if (!this.next[i])
      throw new RangeError(
        "There is no " + i + "th edge in this content match",
      );
    return this.next[i];
  }
  compatible(other) {
    return this.next.some((e) => other.next.some((f) => f.type === e.type));
  }
  fillBefore(after, toEnd = false, startIndex = 0) {
    const queue = [{ state: this, types: [] }],
      seen = new Set([this]);
    for (let i = 0; i < queue.length; i++) {
      const { state, types } = queue[i],
        end = state.matchFragment(after, startIndex);
      if (end && (!toEnd || end.validEnd)) {
        const nodes = types.map((t) => t.createAndFill());
        return nodes.every(Boolean) ? Fragment.from(nodes) : null;
      }
      for (const e of state.next)
        if (!seen.has(e.next) && !e.type.isText && !e.type.hasRequiredAttrs()) {
          seen.add(e.next);
          queue.push({ state: e.next, types: [...types, e.type] });
        }
    }
    return null;
  }
  findWrapping(target) {
    if (this.wrapCache.has(target)) return this.wrapCache.get(target);
    const queue = [{ state: this, types: [] }],
      seen = new Set();
    let found = null;
    for (let i = 0; i < queue.length; i++) {
      const { state, types } = queue[i];
      if (state.matchType(target)) {
        found = types;
        break;
      }
      for (const e of state.next) {
        const t = e.type;
        if (
          t.isLeaf ||
          t.hasRequiredAttrs() ||
          seen.has(t) ||
          (types.length && !e.next.validEnd)
        )
          continue;
        seen.add(t);
        queue.push({ state: t.contentMatch, types: [...types, t] });
      }
    }
    this.wrapCache.set(target, found);
    return found;
  }
  toString() {
    const all = [this];
    for (let i = 0; i < all.length; i++)
      for (const e of all[i].next) if (!all.includes(e.next)) all.push(e.next);
    return all
      .map(
        (s, i) =>
          i +
          (s.validEnd ? "*" : " ") +
          s.next
            .map((e) => e.type.name + "->" + all.indexOf(e.next))
            .join(", "),
      )
      .join("\n");
  }
  static parse(expression, nodeTypes) {
    if (!expression) return ContentMatch.empty;
    // The common single-group repetitions already describe deterministic states.
    // Build them directly, avoiding a temporary NFA for ordinary editor schemas.
    const simple = /^(\w+)([+*?]?)$/.exec(expression);
    if (simple) {
      const types = Object.hasOwn(nodeTypes, simple[1])
        ? [nodeTypes[simple[1]]]
        : Object.values(nodeTypes).filter((type) => type.isInGroup(simple[1]));
      if (
        types.length &&
        types.every((type) => type.isInline === types[0].isInline)
      ) {
        const mode = simple[2],
          optional = mode === "*" || mode === "?";
        if (
          optional ||
          types.some((type) => !type.isText && !type.hasRequiredAttrs())
        ) {
          const start = new ContentMatch(optional);
          const end =
            mode === "*"
              ? start
              : mode === "+"
                ? new ContentMatch(true)
                : ContentMatch.empty;
          start.next = types.map((type) => ({ type, next: end }));
          if (mode === "+") end.next = start.next;
          return start;
        }
      }
    }

    return compile(expression, nodeTypes);
  }
}
ContentMatch.empty = new ContentMatch(true);
function compile(source, nodeTypes) {
  const words = source.match(/\w+|[^\w\s]/g) || [];
  let pos = 0,
    inline;
  const fail = (message) => {
    throw new SyntaxError(
      message + " (in content expression " + JSON.stringify(source) + ")",
    );
  };
  const peek = () => words[pos];
  const eat = (value) => (peek() === value ? (pos++, true) : false);
  const need = (value) => {
    if (!eat(value)) fail("Expected " + value);
  };
  function atom() {
    let tree;
    if (eat("(")) {
      tree = choice();
      need(")");
    } else {
      const word = words[pos++];
      if (!word || !/^\w+$/.test(word)) fail("Unexpected token " + word);
      let types = Object.hasOwn(nodeTypes, word)
        ? [nodeTypes[word]]
        : Object.values(nodeTypes).filter((t) => t.isInGroup(word));
      if (!types.length) fail("No node type or group " + word + " found");
      for (const type of types) {
        if (inline === undefined) inline = type.isInline;
        else if (inline !== type.isInline)
          fail("Mixing inline and block content");
      }
      tree = { types };
    }
    let min, max;
    if (eat("*")) {
      min = 0;
      max = Infinity;
    } else if (eat("+")) {
      min = 1;
      max = Infinity;
    } else if (eat("?")) {
      min = 0;
      max = 1;
    } else if (eat("{")) {
      if (!/^\d+$/.test(peek() || "")) fail("Expected number");
      min = Number(words[pos++]);
      max = min;
      if (eat(",")) {
        max = /^\d+$/.test(peek() || "") ? Number(words[pos++]) : Infinity;
      }
      need("}");
      if (min > max || min > 10000 || (max !== Infinity && max > 10000))
        fail("Invalid or excessive range");
    }
    return min === undefined ? tree : { repeat: tree, min, max };
  }
  function sequence() {
    const parts = [];
    while (pos < words.length && peek() !== ")" && peek() !== "|")
      parts.push(atom());
    if (!parts.length) fail("Missing expression");
    return parts.length === 1 ? parts[0] : { seq: parts };
  }
  function choice() {
    const parts = [sequence()];
    while (eat("|")) parts.push(sequence());
    return parts.length === 1 ? parts[0] : { or: parts };
  }
  const ast = choice();
  if (pos !== words.length) fail("Unexpected trailing token");
  const graph = [];
  const state = () => {
    graph.push([]);
    return graph.length - 1;
  };
  const edge = (a, b, type = null) => graph[a].push({ to: b, type });
  function build(tree, a, b) {
    if (tree.types) {
      for (const t of tree.types) edge(a, b, t);
    } else if (tree.or) {
      for (const item of tree.or) build(item, a, b);
    } else if (tree.seq) {
      let at = a;
      tree.seq.forEach((item, i) => {
        const end = i === tree.seq.length - 1 ? b : state();
        build(item, at, end);
        at = end;
      });
    } else {
      let at = a;
      for (let i = 0; i < tree.min; i++) {
        const end = state();
        build(tree.repeat, at, end);
        at = end;
      }
      if (tree.max === Infinity) {
        edge(at, b);
        const loop = state();
        build(tree.repeat, at, loop);
        edge(loop, at);
      } else {
        for (let i = tree.min; i < tree.max; i++) {
          edge(at, b);
          const end = state();
          build(tree.repeat, at, end);
          at = end;
        }
        edge(at, b);
      }
    }
  }
  const start = state(),
    end = state();
  build(ast, start, end);
  function closure(input) {
    const seen = new Set(),
      stack = [...input];
    while (stack.length) {
      const at = stack.shift();
      if (seen.has(at)) continue;
      seen.add(at);
      for (const e of graph[at]) if (!e.type) stack.push(e.to);
    }
    return [...seen].sort((a, b) => a - b);
  }
  const states = new Map(),
    pending = [];
  function intern(ids) {
    ids = closure(ids);
    const key = ids.join(",");
    let value = states.get(key);
    if (!value) {
      value = new ContentMatch(ids.includes(end));
      states.set(key, value);
      pending.push({ ids, value });
    }
    return value;
  }
  const result = intern([start]);
  for (let i = 0; i < pending.length; i++) {
    const { ids, value } = pending[i],
      moves = new Map();
    for (const id of ids)
      for (const e of graph[id])
        if (e.type) {
          if (!moves.has(e.type)) moves.set(e.type, []);
          moves.get(e.type).push(e.to);
        }
    for (const [type, dest] of moves)
      value.next.push({ type, next: intern(dest) });
  }
  for (const { value } of pending)
    if (
      !value.validEnd &&
      !value.next.some((e) => !e.type.isText && !e.type.hasRequiredAttrs())
    )
      fail(
        "Only non-generatable nodes (" +
          value.next.map((e) => e.type.name).join(", ") +
          ") in a required position",
      );
  return result;
}
module.exports = { ContentMatch };
