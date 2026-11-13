"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const root = process.env.VPERFECT_DIR || path.resolve(__dirname, ".."),
  Ps = require(root),
  { axis } = require(path.join(root, "geometry.cjs"));
const {
  fixture,
} = require("../../../scripts/perfect-scrollbar-conformance/dom.cjs");
function setup(settings) {
  const f = fixture();
  const p = new Ps(f.element, settings);
  return {
    ...f,
    p,
    done() {
      p.destroy();
      f.close();
    },
  };
}
test("geometry keeps clamped thumbs within the viewport", () => {
  for (const size of [0, 1, 100, 333.5])
    for (const content of [0, 50, 700])
      for (const position of [-100, 0, 30, 1000]) {
        const a = axis(
          size,
          content,
          position,
          {
            minScrollbarLength: 20,
            maxScrollbarLength: 60,
            scrollXMarginOffset: 0,
          },
          "X",
        );
        assert.ok(a.length >= 0 && a.length <= size);
        assert.ok(a.offset >= 0 && a.offset <= Math.max(0, size - a.length));
        assert.ok(Number.isFinite(a.offset));
      }
});
test("invalid options leave host untouched", () => {
  const f = fixture();
  for (const value of [
    { handlers: null },
    { handlers: ["touch"] },
    { swipeEasing: true },
    { wheelSpeed: NaN },
    { minScrollbarLength: 50, maxScrollbarLength: 20 },
  ])
    assert.throws(() => new Ps(f.element, value));
  assert.equal(f.element.children.length, 1);
  assert.equal(f.element.className, "");
  f.close();
});
test("one live owner and idempotent cleanup preserve caller classes/styles", () => {
  const f = fixture();
  f.element.className = "caller ps";
  f.element.style.color = "red";
  const p = new Ps(f.element);
  assert.throws(() => new Ps(f.element), /owns/);
  p.destroy();
  p.destroy();
  p.update();
  assert.equal(f.element.className, "caller ps");
  assert.equal(f.element.style.color, "red");
  new Ps(f.element).destroy();
  f.close();
});
test("native scroll events report movement once and ignore unchanged updates", () => {
  const f = setup();
  const events = [];
  for (const name of ["ps-scroll-y", "ps-scroll-down", "ps-y-reach-end"])
    f.element.addEventListener(name, () => events.push(name));
  f.element.scrollTop = 400;
  f.element.dispatchEvent(new f.win.Event("scroll"));
  f.p.update();
  assert.deepEqual(events, ["ps-scroll-y", "ps-scroll-down", "ps-y-reach-end"]);
  assert.equal(f.p.scrollbarY.getAttribute("aria-valuenow"), "400");
  f.done();
});
test("wheel direction, speed and boundary propagation", () => {
  const f = setup({ wheelSpeed: 2 });
  let ev = new f.win.WheelEvent("wheel", {
    deltaY: 10,
    cancelable: true,
    bubbles: true,
  });
  f.element.dispatchEvent(ev);
  assert.equal(f.element.scrollTop, 20);
  assert.equal(ev.defaultPrevented, true);
  f.element.scrollTop = 400;
  f.p.update();
  ev = new f.win.WheelEvent("wheel", { deltaY: 10, cancelable: true });
  f.element.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, false);
  f.done();
});
test("suppressed axes and margin thresholds hide rails", () => {
  const f = setup({ suppressScrollX: true, scrollYMarginOffset: 400 });
  assert.equal(f.p.scrollbarXActive, false);
  assert.equal(f.p.scrollbarYActive, false);
  assert.equal(f.p.scrollbarX.tabIndex, -1);
  f.done();
});
test("updates follow content growth and preserve positions", () => {
  const f = setup();
  f.element.scrollTop = 90;
  f.dimensions.contentHeight = 900;
  f.p.update();
  assert.equal(f.p.contentHeight, 900);
  assert.equal(f.element.scrollTop, 90);
  assert.ok(f.p.scrollbarYHeight < 20);
  f.done();
});
test("destroy during notification does not restore scrolling state", () => {
  const f = setup();
  f.element.addEventListener("ps-scroll-y", () => f.p.destroy());
  f.element.scrollTop = 30;
  f.element.dispatchEvent(new f.win.Event("scroll"));
  assert.equal(f.element.className, "");
  assert.equal(f.element.querySelectorAll("[role=scrollbar]").length, 0);
  f.close();
});
test("destroy removes wheel listeners", () => {
  const f = setup();
  f.p.destroy();
  f.element.dispatchEvent(
    new f.win.WheelEvent("wheel", { deltaY: 30, cancelable: true }),
  );
  assert.equal(f.element.scrollTop, 0);
  f.close();
});

test("generated control IDs restore caller ownership on destroy", () => {
  const f = fixture();
  f.element.removeAttribute("id");
  const p = new Ps(f.element);
  assert.equal(p.scrollbarY.getAttribute("aria-controls"), f.element.id);
  assert.ok(f.element.id);
  p.destroy();
  assert.equal(f.element.hasAttribute("id"), false);
  f.close();
});
test("horizontal thumb keyboard and editable controls retain their semantics", () => {
  const f = setup();
  f.p.scrollbarX.focus();
  f.p.scrollbarX.dispatchEvent(
    new f.win.KeyboardEvent("keydown", {
      key: "End",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.element.scrollLeft, 400);
  assert.equal(f.element.scrollTop, 0);
  const button = f.win.document.createElement("button");
  f.element.append(button);
  button.focus();
  button.dispatchEvent(
    new f.win.KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.element.scrollTop, 0);
  f.done();
});

test("reentrant update callbacks see committed position and reach state", () => {
  const f = setup(),
    seen = [];
  for (const name of ["ps-scroll-y", "ps-scroll-down", "ps-y-reach-end"])
    f.element.addEventListener(name, () => {
      seen.push(name);
      if (seen.length < 8) f.p.update();
    });
  f.element.scrollTop = 400;
  f.p.update();
  assert.deepEqual(seen, ["ps-scroll-y", "ps-scroll-down", "ps-y-reach-end"]);
  assert.equal(f.p.lastScrollTop, 400);
  assert.equal(f.p.reach.y, "end");
  f.done();
});

test("a nested scroll supersedes stale movement and boundary notifications", () => {
  const f = setup(),
    seen = [];
  f.element.addEventListener("ps-scroll-y", () => {
    seen.push(f.element.scrollTop);
    if (f.element.scrollTop === 400) {
      f.element.scrollTop = 100;
      f.p.update();
    }
  });
  f.element.addEventListener("ps-y-reach-end", () => seen.push("stale end"));
  f.element.scrollTop = 400;
  f.p.update();
  assert.deepEqual(seen, [400, 100]);
  assert.equal(f.p.lastScrollTop, 100);
  assert.equal(f.p.reach.y, null);
  f.p.update();
  assert.deepEqual(seen, [400, 100]);
  f.done();
});
