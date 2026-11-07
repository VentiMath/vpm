"use strict";
const Rope = require("vrope-sequence");
const { Plugin, PluginKey } = require("vprosemirror-state");
const { Mapping } = require("vprosemirror-transform");
const key = new PluginKey("history"),
  boundaryKey = new PluginKey("closeHistory");
class Stack {
  constructor(events = Rope.empty) {
    this.events = events;
    this.eventCount = events.length;
  }
  // Events contain only edits; map-only records live in the shared timeline.
  compress() {
    return this;
  }
}
const empty = new Stack();
function initial() {
  return {
    done: empty,
    undone: empty,
    maps: Rope.empty,
    base: 0,
    generation: 0,
    collectAt: 256,
    ranges: null,
    time: 0,
    composition: -1,
  };
}
function resetGrouping(h) {
  return { ...h, ranges: null, time: 0, composition: -1 };
}
function ranges(mapping) {
  const result = [];
  for (let i = mapping.maps.length - 1; i >= 0 && !result.length; i--)
    mapping.maps[i].forEach((_a, _b, from, to) => result.push(from, to));
  return result;
}
function moveRanges(values, mapping) {
  if (!values) return null;
  const result = [];
  for (let i = 0; i < values.length; i += 2) {
    const from = mapping.map(values[i], 1),
      to = mapping.map(values[i + 1], -1);
    if (from <= to) result.push(from, to);
  }
  return result;
}
function adjacent(tr, previous) {
  if (!previous) return false;
  if (!tr.docChanged) return true;
  let hit = false;
  tr.mapping.maps[0].forEach((from, to) => {
    for (let i = 0; i < previous.length; i += 2)
      if (from <= previous[i + 1] && to >= previous[i]) hit = true;
  });
  return hit;
}
function prune(h) {
  const end = h.base + h.maps.length;
  const earliest = Math.min(
    h.done.events.get(0)?.start ?? end,
    h.undone.events.get(0)?.start ?? end,
  );
  return earliest > h.base
    ? { ...h, maps: h.maps.slice(earliest - h.base), base: earliest }
    : h;
}
function mappingFrom(h, anchor, extra = []) {
  const mapping = new Mapping(),
    first = Math.max(anchor, h.base);
  let paired;
  const add = (entry, index) => {
    const mirror = entry.mirror;
    if (
      mirror != null &&
      mirror >= first &&
      mirror < index &&
      !paired?.has(mirror)
    ) {
      mapping.appendMap(entry.map, mirror - first);
      (paired ??= new Set()).add(mirror);
      paired.add(index);
    } else mapping.appendMap(entry.map);
  };
  h.maps.forEach((entry, i) => add(entry, h.base + i), first - h.base);
  for (let i = 0; i < extra.length; i++)
    add(extra[i], h.base + h.maps.length + i);
  return mapping;
}
function record(h, which, tr, bookmark, options, preserve) {
  let stack = h[which],
    event = bookmark ? null : stack.events.get(stack.eventCount - 1),
    maps = h.maps;
  if (!event && !bookmark) {
    return {
      ...h,
      maps: maps.append(tr.mapping.maps.map((map) => ({ map, mirror: null }))),
    };
  }
  if (!event)
    event = {
      records: Rope.empty,
      selection: bookmark,
      start: h.base + maps.length,
      generation: h.generation,
    };
  let records = event.records;
  for (let i = 0; i < tr.steps.length; i++) {
    const inverse = tr.steps[i].invert(tr.docs[i]),
      end = h.base + maps.length,
      last = records.get(records.length - 1),
      tail = maps.get(maps.length - 1);
    const merged =
      !preserve &&
      last &&
      last.anchor === end &&
      last.mapIndex === end - 1 &&
      tail.mirror == null &&
      inverse.merge(last.inverse);
    if (merged) {
      maps = maps
        .slice(0, maps.length - 1)
        .append([{ map: merged.getMap().invert(), mirror: null }]);
      records = records
        .slice(0, records.length - 1)
        .append([{ inverse: merged, anchor: end, mapIndex: end - 1 }]);
    } else {
      maps = maps.append([{ map: tr.mapping.maps[i], mirror: null }]);
      records = records.append([{ inverse, anchor: end + 1, mapIndex: end }]);
    }
  }
  event = { ...event, records };
  let events = bookmark
    ? stack.events.append([event])
    : stack.events.slice(0, stack.eventCount - 1).append([event]);
  if (events.length - options.depth > 20)
    events = events.slice(events.length - options.depth);
  return { ...h, [which]: new Stack(events), maps };
}
function compact(h) {
  h = prune(h);
  if (h.maps.length <= h.collectAt) return h;
  const anchors = [];
  for (const stack of [h.done, h.undone])
    stack.events.forEach((e) => {
      anchors.push(e.start);
      e.records.forEach((r) => {
        anchors.push(r.anchor);
      });
    });
  anchors.sort((a, b) => a - b);
  const between = (a, b) => {
    let lo = 0,
      hi = anchors.length;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (anchors[m] <= a) lo = m + 1;
      else hi = m;
    }
    return lo < anchors.length && anchors[lo] <= b;
  };
  const live = [],
    aliases = new Map(),
    resolve = (id) => {
      while (id != null && aliases.has(id)) id = aliases.get(id);
      return id;
    };
  h.maps.forEach((entry, i) => {
    const index = h.base + i,
      last = live[live.length - 1],
      mirror = resolve(entry.mirror);
    if (last && mirror === last.index && !between(last.index, index)) {
      live.pop();
      aliases.set(last.index, null);
      aliases.set(index, resolve(last.entry.mirror));
    } else live.push({ index, entry: { ...entry, mirror } });
  });
  const remap = new Map(live.map((r, i) => [r.index, h.base + i]));
  const at = (anchor) => {
    let lo = 0,
      hi = live.length;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (live[m].index < anchor) lo = m + 1;
      else hi = m;
    }
    return h.base + lo;
  };
  const index = (id) => remap.get(resolve(id)) ?? null;
  const rewrite = (stack) =>
    new Stack(
      Rope.from(
        stack.events.map((e) => ({
          ...e,
          start: at(e.start),
          records: Rope.from(
            e.records.map((r) => ({
              ...r,
              anchor: at(r.anchor),
              mapIndex: index(r.mapIndex),
            })),
          ),
        })),
      ),
    );
  return prune({
    ...h,
    done: rewrite(h.done),
    undone: rewrite(h.undone),
    maps: Rope.from(
      live.map((r) => ({ map: r.entry.map, mirror: index(r.entry.mirror) })),
    ),
    collectAt: Math.max(256, live.length * 2),
  });
}
function rebase(h, tr, count) {
  if (!Number.isInteger(count) || count < 0 || count > tr.steps.length)
    throw new RangeError("Invalid rebased step count");
  const end = h.base + h.maps.length,
    cut = end - count,
    newBase = cut,
    prefix = cut > h.base ? h.maps.slice(0, cut - h.base) : Rope.empty;
  const maps = prefix.append(
    tr.mapping.maps.slice(count).map((map, i) => {
      const prior = tr.mapping.getMirror(i + count);
      return {
        map,
        mirror:
          prior >= count && prior < i + count ? cut + prior - count : null,
      };
    }),
  );
  const rewrite = (stack) => {
    const events = [];
    stack.events.forEach((event) => {
      let selection = event.selection,
        start = event.start;
      const records = [];
      event.records.forEach((r) => {
        if (r.mapIndex == null || r.mapIndex < cut) {
          records.push(r);
          return;
        }
        const inverseIndex = end - 1 - r.mapIndex,
          rebuilt = tr.mapping.getMirror(inverseIndex);
        if (rebuilt == null) return;
        const index = cut + rebuilt - count;
        if (event.start === r.mapIndex) {
          selection = selection.map(
            tr.mapping.slice(inverseIndex + 1, rebuilt),
          );
          start = index;
        }
        records.push({
          inverse: tr.steps[rebuilt].invert(tr.docs[rebuilt]),
          anchor: index + 1,
          mapIndex: index,
        });
      });
      if (records.length)
        events.push({
          ...event,
          selection,
          start,
          records: Rope.from(records),
        });
    });
    return new Stack(Rope.from(events));
  };
  return prune({
    ...h,
    done: rewrite(h.done),
    undone: rewrite(h.undone),
    maps,
    base: prefix.length ? h.base : newBase,
    generation: h.generation + 1,
    ranges: moveRanges(h.ranges, tr.mapping),
  });
}
function apply(h, state, tr, options) {
  const generated = tr.getMeta(key);
  if (generated) return generated.state;
  if (tr.getMeta(boundaryKey)) h = resetGrouping(h);
  if (!tr.steps.length) return h;
  const parent = tr.getMeta("appendedTransaction"),
    parentHistory = parent?.getMeta(key),
    preserve = state.plugins.some((p) => p.spec.historyPreserveItems);
  if (parentHistory) {
    h = record(
      h,
      parentHistory.redo ? "done" : "undone",
      tr,
      null,
      options,
      preserve,
    );
    return compact({
      ...h,
      ranges: parentHistory.redo ? ranges(tr.mapping) : null,
    });
  }
  if (
    tr.getMeta("addToHistory") !== false &&
    parent?.getMeta("addToHistory") !== false
  ) {
    const composition = tr.getMeta("composition"),
      fresh =
        !h.time ||
        (!parent &&
          h.composition !== composition &&
          (h.time < (tr.time || 0) - options.newGroupDelay ||
            !adjacent(tr, h.ranges)));
    const bookmark =
      fresh || !h.done.eventCount ? state.selection.getBookmark() : null;
    const next = record(
      { ...h, undone: empty },
      "done",
      tr,
      bookmark,
      options,
      preserve,
    );
    return compact({
      ...next,
      ranges: parent ? moveRanges(h.ranges, tr.mapping) : ranges(tr.mapping),
      time: tr.time,
      composition: composition == null ? h.composition : composition,
    });
  }
  const rebased = tr.getMeta("rebased");
  if (rebased) return rebase(h, tr, rebased);
  return compact({
    ...h,
    maps: h.maps.append(tr.mapping.maps.map((map) => ({ map, mirror: null }))),
    generation: h.generation + 1,
    ranges: moveRanges(h.ranges, tr.mapping),
  });
}
function buildCommand(redo, scroll) {
  return (state, dispatch) => {
    const h = key.getState(state),
      source = redo ? "undone" : "done",
      target = redo ? "done" : "undone";
    if (!h || !h[source].eventCount) return false;
    if (!dispatch) return true;
    const event = h[source].events.get(h[source].eventCount - 1),
      tr = state.tr,
      extra = [],
      records = [],
      start = h.base + h.maps.length,
      selection = state.selection.getBookmark(),
      clean = event.generation === h.generation;
    event.records.forEach(
      (record) => {
        const step = clean
          ? record.inverse
          : record.inverse.map(mappingFrom(h, record.anchor, extra));
        if (step) {
          const before = tr.doc,
            result = tr.maybeStep(step);
          if (result.doc) {
            const index = start + extra.length;
            extra.push({ map: step.getMap(), mirror: record.mapIndex });
            records.push({
              inverse: step.invert(before),
              anchor: index + 1,
              mapIndex: index,
            });
          }
        }
      },
      event.records.length,
      0,
    );
    const bookmark = clean
      ? event.selection
      : event.selection.map(mappingFrom(h, event.start, extra));
    const other = records.length
      ? new Stack(
          h[target].events.append([
            {
              selection,
              start,
              generation: h.generation,
              records: Rope.from(records),
            },
          ]),
        )
      : h[target];
    const next = compact(
      resetGrouping({
        ...h,
        [source]: new Stack(
          h[source].events.slice(0, h[source].eventCount - 1),
        ),
        [target]: other,
        maps: h.maps.append(extra),
      }),
    );
    tr.setSelection(bookmark.resolve(tr.doc)).setMeta(key, {
      redo,
      state: next,
    });
    dispatch(scroll ? tr.scrollIntoView() : tr);
    return true;
  };
}
function history(config = {}) {
  const options = {
    depth: config.depth || 100,
    newGroupDelay: config.newGroupDelay || 500,
  };
  if (
    !(
      options.depth === Infinity ||
      (Number.isInteger(options.depth) && options.depth > 0)
    ) ||
    !(
      options.newGroupDelay === Infinity ||
      (Number.isFinite(options.newGroupDelay) && options.newGroupDelay >= 0)
    )
  )
    throw new RangeError("Invalid history depth or delay");
  return new Plugin({
    key,
    config: options,
    state: {
      init: initial,
      apply: (tr, h, state) => apply(h, state, tr, options),
    },
    props: {
      handleDOMEvents: {
        beforeinput(view, event) {
          const command =
            event.inputType === "historyUndo"
              ? undo
              : event.inputType === "historyRedo"
                ? redo
                : null;
          if (!command || !view.editable) return false;
          event.preventDefault();
          return command(view.state, view.dispatch);
        },
      },
    },
  });
}
const undo = buildCommand(false, true),
  redo = buildCommand(true, true),
  undoNoScroll = buildCommand(false, false),
  redoNoScroll = buildCommand(true, false);
const closeHistory = (tr) => tr.setMeta(boundaryKey, true),
  undoDepth = (state) => key.getState(state)?.done.eventCount || 0,
  redoDepth = (state) => key.getState(state)?.undone.eventCount || 0,
  isHistoryTransaction = (tr) => tr.getMeta(key) != null;
module.exports = {
  history,
  closeHistory,
  undo,
  redo,
  undoNoScroll,
  redoNoScroll,
  undoDepth,
  redoDepth,
  isHistoryTransaction,
};
