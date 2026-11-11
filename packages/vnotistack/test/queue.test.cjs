"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const { Queue, Deadline } = require(
  process.env.VNOTISTACK_DIR
    ? path.join(process.env.VNOTISTACK_DIR, "queue.cjs")
    : "../queue.cjs",
);
const ids = (q) => q.visible.map((e) => e.id);
function clock() {
  let serial = 0;
  const tasks = new Map();
  return {
    tasks,
    setTimeout(fn, ms) {
      tasks.set(++serial, { fn, ms });
      return serial;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
    fire() {
      const [id, t] = tasks.entries().next().value;
      tasks.delete(id);
      t.fn();
    },
  };
}
test("FIFO queue requests one eviction and waits for entry and exit", () => {
  const events = [],
    q = new Queue({ maxSnack: 2, onClose: (e, r, k) => events.push([r, k]) });
  q.enqueue("a", { key: "a" });
  q.enqueue("b", { key: "b" });
  q.enqueue("c", { key: "c" });
  q.enqueue("d", { key: "d" });
  assert.deepEqual(ids(q), ["a", "b"]);
  assert.equal(q.visible[0].requested.reason, "maxsnack");
  assert.equal(events.length, 0);
  const a = q.visible[0];
  q.entered(a);
  assert.equal(a.open, false);
  assert.deepEqual(events, [["maxsnack", "a"]]);
  q.exited(a);
  assert.deepEqual(ids(q), ["b", "c"]);
  assert.equal(q.visible[0].requested.reason, "maxsnack");
});
test("persistent entries yield only when all visible entries are persistent", () => {
  const q = new Queue({ maxSnack: 2 });
  q.enqueue("a", { key: "a", persist: true });
  q.enqueue("b", { key: "b" });
  q.visible.forEach((e) => q.entered(e));
  q.enqueue("c");
  assert.equal(q.visible[0].open, true);
  assert.equal(q.visible[1].open, false);
  const r = new Queue({ maxSnack: 1 });
  r.enqueue("a", { persist: true });
  r.entered(r.visible[0]);
  r.enqueue("b");
  assert.equal(r.visible[0].open, false);
});
test("duplicate keys preserve React identity and duplicate messages can be prevented", () => {
  const q = new Queue({ maxSnack: 5, preventDuplicate: true });
  q.enqueue("a", { key: 0 });
  q.enqueue("b", { key: 0 });
  q.enqueue("x");
  q.enqueue("x");
  assert.equal(q.visible.length, 2);
  q.enqueue("x", { key: "different" });
  assert.equal(q.visible.length, 3);
});
test("closing a queued entry removes it without disturbing displayed messages", () => {
  const q = new Queue({ maxSnack: 1 });
  q.enqueue("a", { key: "a" });
  q.enqueue("b", { key: "b" });
  q.close("b");
  assert.equal(q.pending.length, 0);
  q.entered(q.visible[0]);
  q.exited(q.visible[0]);
  assert.equal(q.visible.length, 0);
});
test("close all clears pending messages and reports undefined key once per visible item", () => {
  const keys = [],
    q = new Queue({ maxSnack: 2, onClose: (e, r, k) => keys.push(k) });
  q.enqueue("a");
  q.enqueue("b");
  q.visible.forEach((e) => q.entered(e));
  q.close();
  q.close();
  assert.deepEqual(keys, [undefined, undefined]);
  assert.ok(q.visible.every((e) => !e.open));
});
test("option snapshots and callback ordering survive caller mutation", () => {
  const seen = [],
    q = new Queue({ onClose: () => seen.push("provider") });
  const o = {
    key: "a",
    anchorOrigin: { vertical: "top", horizontal: "right" },
    onClose: () => seen.push("item"),
  };
  q.enqueue({ message: "a", ...o });
  o.anchorOrigin.horizontal = "left";
  o.onClose = () => seen.push("changed");
  const a = q.visible[0];
  assert.equal(a.options.anchorOrigin.horizontal, "right");
  q.entered(a);
  q.close("a");
  assert.deepEqual(seen, ["item", "provider"]);
});
test("throwing callbacks do not prevent other closes or stall state notification", () => {
  let changes = 0;
  const q = new Queue(
    {
      maxSnack: 2,
      onClose: () => {
        throw 0;
      },
    },
    () => changes++,
  );
  q.enqueue("a");
  q.enqueue("b");
  q.visible.forEach((e) => q.entered(e));
  const before = changes;
  assert.throws(
    () => q.close(),
    (e) => e === 0,
  );
  assert.ok(q.visible.every((e) => !e.open));
  assert.ok(changes > before);
});
test("reentrant close callback enqueues without duplicate eviction", () => {
  let q;
  q = new Queue({ maxSnack: 1, onClose: () => q.enqueue("from callback") });
  q.enqueue("a");
  q.entered(q.visible[0]);
  q.close();
  assert.equal(q.pending.length, 1);
  q.exited(q.visible[0]);
  assert.equal(q.visible[0].message, "from callback");
});
test("invalid options fail before changing queues", () => {
  const q = new Queue();
  for (const o of [
    { autoHideDuration: NaN },
    { transitionDuration: -1 },
    { key: {} },
    { anchorOrigin: { vertical: "side", horizontal: "left" } },
    { TransitionComponent: () => null },
  ])
    assert.throws(() => q.enqueue("bad", o));
  assert.equal(q.visible.length, 0);
  assert.throws(() => new Queue({ maxSnack: 0 }));
});
test("disposal rejects stale enqueue and ignores late completion", () => {
  const q = new Queue();
  q.enqueue("a");
  const e = q.visible[0];
  q.dispose();
  assert.throws(() => q.enqueue("b"), /unmounted/);
  q.exited(e);
  q.close();
  assert.equal(q.visible.length, 0);
});
test("default and per-notification options retain zero/null/false", () => {
  const q = new Queue({ autoHideDuration: 50, preventDuplicate: true });
  q.enqueue("a", {
    autoHideDuration: null,
    persist: false,
    preventDuplicate: false,
    transitionDuration: 0,
  });
  const x = q.visible[0].options;
  assert.equal(x.autoHideDuration, null);
  assert.equal(x.transitionDuration, 0);
  assert.equal(x.persist, false);
});
test("deadline resumes at half duration and overlapping pause reasons remain paused", () => {
  const c = clock();
  let count = 0;
  const d = new Deadline(() => count++, 100, c);
  d.arm();
  assert.equal(c.tasks.values().next().value.ms, 100);
  d.pause("hover");
  d.pause("window");
  d.resume("hover");
  assert.equal(c.tasks.size, 0);
  d.resume("window");
  assert.equal(c.tasks.values().next().value.ms, 50);
  c.fire();
  assert.equal(count, 1);
});
test("persistent deadlines do not schedule and stopped timers cannot restart", () => {
  const c = clock(),
    d = new Deadline(() => {}, null, c);
  d.arm();
  assert.equal(c.tasks.size, 0);
  const e = new Deadline(() => {}, 0, c);
  e.arm();
  assert.equal(c.tasks.size, 1);
  e.stop();
  e.arm();
  assert.equal(c.tasks.size, 0);
});

test("unchanged maxSnack configuration does not trigger another render", () => {
  let changed = 0;
  const q = new Queue({ maxSnack: 5 }, () => changed++);
  q.configure({ maxSnack: 5 });
  assert.equal(changed, 0);
  q.configure({ maxSnack: 2 });
  assert.equal(changed, 1);
});
