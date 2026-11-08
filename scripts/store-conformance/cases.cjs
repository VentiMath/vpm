"use strict";
const assert = require("node:assert/strict");
function graph(api, seed) {
  const { createAtom, batch, flush } = api;
  let state = seed >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const sources = Array.from({ length: 4 }, (_, i) => createAtom(i)),
    flag = createAtom(true),
    events = [];
  const nodes = [
    ...sources,
    createAtom(() => (flag.get() ? sources[0].get() : sources[1].get())),
  ];
  for (let i = 5; i < 18; i++) {
    const a = Math.floor(random() * i),
      b = Math.floor(random() * i);
    nodes.push(createAtom(() => (nodes[a].get() + nodes[b].get()) % 17));
  }
  const subscriptions = nodes
    .slice(4)
    .map((node, i) => node.subscribe((value) => events.push([i, value])));
  const outputs = [];
  for (let i = 0; i < 60; i++) {
    const perform = () => {
      sources[Math.floor(random() * 4)].set(Math.floor(random() * 23));
      if (random() < 0.2) flag.set((x) => !x);
    };
    if (i % 3 === 0)
      batch(() => {
        perform();
        perform();
        if (i % 2 === 0) nodes[15].get();
      });
    else perform();
    outputs.push(nodes.map((n) => n.get()));
  }
  subscriptions.forEach((s) => s.unsubscribe());
  sources[0].set(42);
  flush();
  outputs.push(nodes.map((n) => n.get()));
  return {
    outputs,
    events: Array.from({ length: 14 }, (_, i) =>
      events.filter(([id]) => id === i).map(([, value]) => value),
    ),
  };
}
function publicCases(api) {
  const {
    createAtom,
    createStore,
    Store,
    ReadonlyStore,
    batch,
    flush,
    shallow,
    toObserver,
  } = api;
  const out = [];
  const options = Object.freeze({ compare: (a, b) => a.n === b.n });
  const first = { n: 1 };
  const a = createAtom(first, options),
    values = [];
  a.subscribe((v) => values.push(v.n));
  a.set({ n: 1 });
  out.push(a.get() === first);
  a.set((v) => ({ n: v.n + 1 }));
  batch(() => {
    a.set({ n: 3 });
    batch(() => a.set({ n: 4 }));
    flush();
    a.set({ n: 5 });
  });
  out.push(values);
  const b = createAtom(0),
    c = createAtom((p) => (p ?? 0) + b.get()),
    history = [];
  c.subscribe((v) => history.push(v));
  b.set(2);
  b.set(3);
  out.push(c.get(), history);
  const store = createStore(2, (s) => ({
    add: (n) => s.setState((x) => x + n),
  }));
  const set = store.setState,
    get = store.get;
  set((x) => x + 2);
  store.actions.add(3);
  out.push(
    get(),
    store.state,
    createStore(() => store.get() * 2).get(),
    new Store(4).get(),
    new ReadonlyStore(5).state,
  );
  const obj = {
    n: 4,
    next(v) {
      out.push(this.n + v);
    },
  };
  toObserver(obj).next(2);
  const shallowPairs = [
    [NaN, NaN],
    [0, -0],
    [{ a: 1 }, { a: 1 }],
    [{ a: 1 }, { b: 1 }],
    [null, {}],
    [[1, 2], { 0: 1, 1: 2 }],
    [new Map([[1, 2]]), new Map([[1, 2]])],
    [new Map([[1, undefined]]), new Map([[2, undefined]])],
    [new Set([2, 1]), new Set([1, 2])],
    [new Date(3), new Date(3)],
    [new Date(NaN), new Date(NaN)],
    [/a/, /b/],
    [Object.create(null), {}],
  ];
  out.push(shallowPairs.map(([a, b]) => shallow(a, b)));
  return out;
}
function compare(candidate, control) {
  assert.deepEqual(
    publicCases(candidate),
    publicCases(control),
    "public API cases",
  );
  for (let seed = 1; seed <= 160; seed++)
    assert.deepEqual(
      graph(candidate, seed),
      graph(control, seed),
      "graph seed " + seed,
    );
  return "160 seeded dynamic/diamond graphs, 9,600 update rounds and public store/batch/shallow cases match.";
}
module.exports = { compare, graph, publicCases };
