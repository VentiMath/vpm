"use strict";
// Independent token-span differ. The edit frontier carries immutable run links;
// emitted values are sliced from the original strings, not rebuilt from words.
const alphabet =
  "A-Za-z0-9_\\u00AD\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C6\\u02C8-\\u02D7\\u02DE-\\u02FF\\u1E00-\\u1EFF";
const wordPattern = new RegExp("[" + alphabet + "]+|[^\\s]", "gu");
const spacePattern = new RegExp(
  "[" + alphabet + "]+|\\r\\n|[^\\S\\r\\n]+|[\\s\\S]",
  "gu",
);
function tokens(text, space, options) {
  const out = [];
  if (!space && options.intlSegmenter) {
    const segmenter = options.intlSegmenter;
    if (
      typeof segmenter.segment !== "function" ||
      segmenter.resolvedOptions?.().granularity !== "word"
    )
      throw new TypeError("intlSegmenter must use word granularity");
    for (const part of segmenter.segment(text))
      if (!/^\s+$/.test(part.segment))
        out.push({
          start: part.index,
          end: part.index + part.segment.length,
          key: options.ignoreCase ? part.segment.toLowerCase() : part.segment,
        });
  } else {
    for (const match of text.matchAll(space ? spacePattern : wordPattern))
      out.push({
        start: match.index,
        end: match.index + match[0].length,
        key: options.ignoreCase ? match[0].toLowerCase() : match[0],
      });
  }
  if (!space && !out.length && text.length)
    out.push({ start: 0, end: text.length, key: "" });
  return out;
}
const link = (prev, kind, start, count) =>
  count ? { prev, kind, start, count } : prev;
function* edits(a, b, options) {
  const n = a.length,
    m = b.length,
    limit = Math.min(options.maxEditLength ?? n + m, n + m);
  let x = 0;
  while (x < n && x < m && a[x].key === b[x].key) x++;
  const first = { x, node: link(null, 0, 0, x) };
  if (x === n && x === m) return first.node;
  if (performance.now() >= options.deadline) return undefined;
  if (!n || !m)
    return n + m <= limit ? link(null, n ? -1 : 1, 0, n || m) : undefined;
  // Completely disjoint text needs no quadratic edit frontier.
  if (n + m > 512) {
    const keys = new Set(a.map((t) => t.key));
    if (!b.some((t) => keys.has(t.key)))
      return n + m <= limit ? link(link(null, -1, 0, n), 1, 0, m) : undefined;
  }
  let frontier = new Map([[0, first]]);
  for (let distance = 1; distance <= limit; distance++) {
    if (performance.now() >= options.deadline) return undefined;
    const next = new Map();
    for (let k = -distance; k <= distance; k += 2) {
      if ((k & 255) === 0 && performance.now() >= options.deadline)
        return undefined;
      const fromRemove = frontier.get(k - 1),
        fromAdd = frontier.get(k + 1);
      const remove = fromRemove && fromRemove.x < n ? fromRemove : undefined;
      const add = fromAdd && fromAdd.x - (k + 1) < m ? fromAdd : undefined;
      if (!remove && !add) continue;
      let position, node;
      if (remove && (!add || remove.x + 1 > add.x)) {
        position = remove.x + 1;
        node = link(remove.node, -1, remove.x, 1);
      } else {
        position = add.x;
        node = link(add.node, 1, position - k - 1, 1);
      }
      let y = position - k,
        begin = y;
      while (position < n && y < m && a[position].key === b[y].key) {
        position++;
        y++;
        if ((position & 4095) === 0 && performance.now() >= options.deadline)
          return undefined;
      }
      node = link(node, 0, begin, y - begin);
      if (position === n && y === m) return node;
      next.set(k, { x: position, node });
    }
    frontier = next;
    yield;
  }
  return undefined;
}
const leading = (s) => s.match(/^\s*/)[0];
const trailing = (s) => s.match(/\s*$/)[0];
function prefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
function suffix(a, b) {
  let i = 0;
  while (
    i < a.length &&
    i < b.length &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  )
    i++;
  return i;
}
function trimEnd(value, count) {
  return count ? value.slice(0, -count) : value;
}
function spacing(changes) {
  for (let i = 0; i < changes.length; ) {
    if (!changes[i].added && !changes[i].removed) {
      i++;
      continue;
    }
    const prev = i ? changes[i - 1] : undefined;
    const del = changes[i].removed ? changes[i++] : undefined;
    const add = changes[i]?.added ? changes[i++] : undefined;
    const next = changes[i];
    const left = prev ? trailing(prev.value) : "",
      right = next ? leading(next.value) : "";
    if (del && add) {
      if (prev) {
        const p = prefix(left, leading(del.value));
        prev.value = trimEnd(prev.value, left.length - p);
        del.value = del.value.slice(p);
        add.value = add.value.slice(p);
      }
      if (next) {
        const q = suffix(right, trailing(del.value));
        next.value = next.value.slice(right.length - q);
        del.value = trimEnd(del.value, q);
        add.value = trimEnd(add.value, q);
      }
    } else if (add) {
      if (prev) add.value = add.value.slice(left.length);
      if (next) next.value = next.value.slice(right.length);
    } else if (del) {
      const start = leading(del.value),
        end = trailing(del.value);
      const sharedLeft = prefix(left, start);
      const sharedRight = suffix(prev ? right.slice(sharedLeft) : right, end);
      del.value = trimEnd(del.value.slice(sharedLeft), sharedRight);
      if (prev && next) {
        prev.value = trimEnd(prev.value, sharedRight);
        next.value = next.value.slice(right.length - sharedRight);
      }
    }
  }
  return changes;
}
function finish(node, a, b, oldText, newText, space, options) {
  if (!node) return [];
  const steps = [];
  for (let p = node; p; p = p.prev) steps.push(p);
  steps.reverse();
  const runs = [];
  const append = (kind, start, count) => {
    const last = runs.at(-1);
    if (last?.kind === kind && last.start + last.count === start)
      last.count += count;
    else runs.push({ kind, start, count });
  };
  for (let i = 0; i < steps.length; ) {
    if (steps[i].kind === 0) {
      const s = steps[i++];
      append(0, s.start, s.count);
      continue;
    }
    const block = [];
    while (i < steps.length && steps[i].kind !== 0) block.push(steps[i++]);
    for (const kind of [-1, 1])
      for (const s of block)
        if (s.kind === kind) append(kind, s.start, s.count);
  }
  const out = [];
  for (const run of runs) {
    const list = run.kind === -1 ? a : b,
      text = run.kind === -1 ? oldText : newText;
    for (let start = run.start; start < run.start + run.count; ) {
      const count = options.oneChangePerToken ? 1 : run.count,
        end = start + count;
      const from = space ? list[start].start : start ? list[start - 1].end : 0;
      const to = space
        ? list[end - 1].end
        : end < list.length
          ? list[end].start
          : text.length;
      out.push({
        count,
        added: run.kind === 1,
        removed: run.kind === -1,
        value: text.slice(from, to),
      });
      start = end;
    }
  }
  return !space && !options.oneChangePerToken ? spacing(out) : out;
}
function diff(oldText, newText, input, space) {
  if (typeof oldText !== "string" || typeof newText !== "string")
    throw new TypeError("diff inputs must be strings");
  const options =
    typeof input === "function"
      ? { callback: input }
      : input === undefined
        ? {}
        : input;
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("options must be an object or callback");
  if (options.callback !== undefined && typeof options.callback !== "function")
    throw new TypeError("callback must be a function");
  if (
    options.maxEditLength !== undefined &&
    options.maxEditLength !== Infinity &&
    (!Number.isSafeInteger(options.maxEditLength) || options.maxEditLength < 0)
  )
    throw new TypeError(
      "maxEditLength must be a non-negative integer or Infinity",
    );
  if (
    options.timeout !== undefined &&
    (typeof options.timeout !== "number" ||
      Number.isNaN(options.timeout) ||
      options.timeout < 0)
  )
    throw new TypeError("timeout must be non-negative");
  const settings = {
    ...options,
    deadline:
      options.timeout === undefined
        ? Infinity
        : performance.now() + options.timeout,
  };
  if (options.ignoreWhitespace === false) space = true;
  const a = tokens(oldText, space, settings),
    b = oldText === newText ? a : tokens(newText, space, settings),
    steps = edits(a, b, settings);
  const complete = (value) =>
    value === undefined
      ? undefined
      : finish(value, a, b, oldText, newText, space, settings);
  if (options.callback) {
    const tick = () => {
      const until = performance.now() + 4;
      let state;
      do {
        state = steps.next();
        if (state.done) {
          settings.callback(complete(state.value));
          return;
        }
      } while (performance.now() < until);
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
    return undefined;
  }
  let state;
  do {
    state = steps.next();
  } while (!state.done);
  return complete(state.value);
}
function diffWords(a, b, options) {
  return diff(a, b, options, false);
}
function diffWordsWithSpace(a, b, options) {
  return diff(a, b, options, true);
}
module.exports = { diffWords, diffWordsWithSpace };
