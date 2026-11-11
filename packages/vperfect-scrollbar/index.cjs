"use strict";
const { axis, clamp } = require("./geometry.cjs");
const live = new WeakMap();
let serial = 0;
const defaults = {
  handlers: ["click-rail", "drag-thumb", "keyboard", "wheel"],
  wheelSpeed: 1,
  wheelPropagation: true,
  useBothWheelAxes: false,
  minScrollbarLength: null,
  maxScrollbarLength: null,
  scrollingThreshold: 1000,
  scrollXMarginOffset: 0,
  scrollYMarginOffset: 0,
  suppressScrollX: false,
  suppressScrollY: false,
};
function options(input = {}) {
  const value = { ...defaults, ...input };
  if (Object.hasOwn(input, "swipeEasing"))
    throw new TypeError(
      "Touch/swipe scrolling is outside the desktop scrollbar contract",
    );
  if (
    !Array.isArray(value.handlers) ||
    value.handlers.some((x) => !defaults.handlers.includes(x))
  )
    throw new TypeError("Unsupported scrollbar handler");
  value.handlers = [...new Set(value.handlers)];
  for (const key of [
    "wheelSpeed",
    "scrollingThreshold",
    "scrollXMarginOffset",
    "scrollYMarginOffset",
    "minScrollbarLength",
    "maxScrollbarLength",
  ])
    if (value[key] !== null && (!Number.isFinite(value[key]) || value[key] < 0))
      throw new RangeError(key + " must be finite and nonnegative");
  if (
    value.minScrollbarLength !== null &&
    value.maxScrollbarLength !== null &&
    value.minScrollbarLength > value.maxScrollbarLength
  )
    throw new RangeError("minScrollbarLength exceeds maxScrollbarLength");
  return value;
}
function style(node, key, value) {
  if (node.style[key] !== value) node.style[key] = value;
}
function attr(node, key, value) {
  value = String(value);
  if (node.getAttribute(key) !== value) node.setAttribute(key, value);
}
class PerfectScrollbar {
  constructor(element, settings = {}) {
    if (typeof element === "string")
      element = globalThis.document?.querySelector(element);
    if (
      !element ||
      element.nodeType !== 1 ||
      !element.ownerDocument?.defaultView ||
      typeof element.scrollTop !== "number"
    )
      throw new TypeError("A live scroll element is required");
    if (live.has(element))
      throw new Error("A scrollbar already owns this element");
    this.settings = options(settings);
    this.element = element;
    this.ownerDocument = element.ownerDocument;
    this.window = this.ownerDocument.defaultView;
    this.isAlive = true;
    this.listeners = [];
    this.timers = {};
    this.frame = null;
    this.drag = null;
    this.hover = false;
    this.reach = { x: null, y: null };
    this.lastScrollTop = element.scrollTop;
    this.lastScrollLeft = element.scrollLeft;
    this.savedClasses = new Map();
    for (const name of [
      "ps",
      "ps--active-x",
      "ps--active-y",
      "ps--scrolling-x",
      "ps--scrolling-y",
      "ps--focus",
      "ps--clicking",
    ])
      this.savedClasses.set(name, element.classList.contains(name));
    element.classList.add("ps");
    live.set(element, this);
    this.originalId = element.getAttribute("id");
    if (!element.id) {
      do {
        this.ownedId = "vps-" + ++serial;
      } while (this.ownerDocument.getElementById(this.ownedId));
      element.id = this.ownedId;
    }
    for (const name of ["X", "Y"]) {
      const rail = this.ownerDocument.createElement("div"),
        thumb = this.ownerDocument.createElement("div");
      rail.className = "ps__rail-" + name.toLowerCase();
      thumb.className = "ps__thumb-" + name.toLowerCase();
      thumb.tabIndex = 0;
      thumb.setAttribute("role", "scrollbar");
      thumb.setAttribute("aria-controls", element.id);
      thumb.setAttribute(
        "aria-orientation",
        name === "X" ? "horizontal" : "vertical",
      );
      thumb.setAttribute(
        "aria-label",
        name === "X" ? "Horizontal scroll" : "Vertical scroll",
      );
      rail.append(thumb);
      element.append(rail);
      this["scrollbar" + name + "Rail"] = rail;
      this["scrollbar" + name] = thumb;
    }
    this.update();
    this.listen(element, "scroll", () => this.sync());
    this.listen(element, "mouseenter", () => {
      this.hover = true;
    });
    this.listen(element, "mouseleave", () => {
      this.hover = false;
    });
    this.listen(element, "focusin", () => element.classList.add("ps--focus"));
    this.listen(element, "focusout", (e) => {
      if (!element.contains(e.relatedTarget))
        element.classList.remove("ps--focus");
    });
    if (this.settings.handlers.includes("wheel"))
      this.listen(element, "wheel", (e) => this.wheel(e), { passive: false });
    if (this.settings.handlers.includes("keyboard"))
      this.listen(this.ownerDocument, "keydown", (e) => this.key(e));
    for (const name of ["X", "Y"]) {
      if (this.settings.handlers.includes("click-rail"))
        this.listen(this["scrollbar" + name + "Rail"], "mousedown", (e) => {
          if (e.button !== 0 || e.target !== e.currentTarget) return;
          const rect = this["scrollbar" + name].getBoundingClientRect();
          this.move(
            name,
            (name === "Y" ? e.clientY < rect.top : e.clientX < rect.left)
              ? -this["container" + (name === "Y" ? "Height" : "Width")]
              : this["container" + (name === "Y" ? "Height" : "Width")],
          );
          e.preventDefault();
          e.stopPropagation();
        });
      if (this.settings.handlers.includes("drag-thumb"))
        this.listen(this["scrollbar" + name], "pointerdown", (e) =>
          this.startDrag(e, name),
        );
    }
    this.listen(this.window, "resize", () => this.schedule());
    this.listen(this.window, "blur", () => this.endDrag());
    if (this.window.ResizeObserver) {
      this.resize = new this.window.ResizeObserver(() => this.schedule());
      this.observeChildren();
    }
    if (this.window.MutationObserver) {
      this.mutation = new this.window.MutationObserver((records) => {
        if (!this.isAlive) return;
        if (records.some((r) => !this.owned(r.target))) {
          this.observeChildren();
          this.schedule();
        }
      });
      this.mutation.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["dir"],
      });
      for (
        let parent = element.parentElement;
        parent;
        parent = parent.parentElement
      )
        this.mutation.observe(parent, {
          attributes: true,
          attributeFilter: ["dir"],
        });
    }
  }
  listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.listeners.push(() => target.removeEventListener(type, fn, opts));
  }
  owned(node) {
    return (
      node === this.scrollbarXRail ||
      node === this.scrollbarYRail ||
      this.scrollbarXRail.contains(node) ||
      this.scrollbarYRail.contains(node)
    );
  }
  observeChildren() {
    if (!this.resize || !this.isAlive) return;
    this.resize.disconnect();
    this.resize.observe(this.element);
    for (const child of this.element.children)
      if (!this.owned(child)) this.resize.observe(child);
  }
  schedule() {
    if (!this.isAlive || this.frame !== null) return;
    this.frame = this.window.requestAnimationFrame(() => {
      this.frame = null;
      this.update();
    });
  }
  update() {
    if (!this.isAlive) return;
    this.isRtl = this.window.getComputedStyle(this.element).direction === "rtl";
    this.isNegativeScroll = this.isRtl;
    this.sync();
  }
  sync() {
    if (!this.isAlive) return;
    const e = this.element,
      s = this.settings;
    this.containerWidth = e.clientWidth;
    this.containerHeight = e.clientHeight;
    this.contentWidth = e.scrollWidth;
    this.contentHeight = e.scrollHeight;
    if (s.suppressScrollX && e.scrollLeft) e.scrollLeft = 0;
    if (s.suppressScrollY && e.scrollTop) e.scrollTop = 0;
    this.negativeScrollAdjustment = this.isRtl
      ? Math.max(0, e.scrollWidth - e.clientWidth)
      : 0;
    const x = axis(
        e.clientWidth,
        e.scrollWidth,
        this.isRtl ? -e.scrollLeft : e.scrollLeft,
        s,
        "X",
      ),
      y = axis(e.clientHeight, e.scrollHeight, e.scrollTop, s, "Y");
    this.axes = { X: x, Y: y };
    this.scrollbarXActive = x.active;
    this.scrollbarYActive = y.active;
    this.scrollbarXWidth = x.length;
    this.scrollbarYHeight = y.length;
    this.scrollbarXLeft = this.isRtl ? x.travel - x.offset : x.offset;
    this.scrollbarYTop = y.offset;
    e.classList.toggle("ps--active-x", x.active);
    e.classList.toggle("ps--active-y", y.active);
    for (const name of ["X", "Y"]) {
      const a = this.axes[name],
        thumb = this["scrollbar" + name],
        rail = this["scrollbar" + name + "Rail"];
      const horizontal = name === "X";
      style(
        rail,
        horizontal ? "width" : "height",
        this[horizontal ? "containerWidth" : "containerHeight"] + "px",
      );
      style(rail, "transform", `translate(${e.scrollLeft}px,${e.scrollTop}px)`);
      style(thumb, horizontal ? "width" : "height", a.length + "px");
      style(
        thumb,
        horizontal ? "left" : "top",
        (horizontal ? this.scrollbarXLeft : this.scrollbarYTop) + "px",
      );
      attr(thumb, "aria-valuemin", 0);
      attr(thumb, "aria-valuemax", a.range);
      attr(
        thumb,
        "aria-valuenow",
        clamp(
          horizontal
            ? this.isRtl
              ? -e.scrollLeft
              : e.scrollLeft
            : e.scrollTop,
          0,
          a.range,
        ),
      );
      attr(thumb, "aria-hidden", !a.active);
      thumb.tabIndex = a.active ? 0 : -1;
    }
    const left = e.scrollLeft,
      top = e.scrollTop;
    if (top !== this.lastScrollTop) {
      this.emit("ps-scroll-y");
      this.emit(top > this.lastScrollTop ? "ps-scroll-down" : "ps-scroll-up");
      this.scrolling("y");
    }
    if (left !== this.lastScrollLeft) {
      this.emit("ps-scroll-x");
      this.emit(
        left > this.lastScrollLeft ? "ps-scroll-right" : "ps-scroll-left",
      );
      this.scrolling("x");
    }
    this.lastScrollTop = top;
    this.lastScrollLeft = left;
    for (const name of ["x", "y"]) {
      const next = this.axes[name.toUpperCase()].reach;
      if (next !== this.reach[name] && next)
        this.emit("ps-" + name + "-reach-" + next);
      this.reach[name] = next;
    }
  }
  emit(name) {
    if (!this.isAlive) return;
    this.element.dispatchEvent(new this.window.Event(name));
  }
  scrolling(axis) {
    if (!this.isAlive) return;
    this.element.classList.add("ps--scrolling-" + axis);
    this.window.clearTimeout(this.timers[axis]);
    this.timers[axis] = this.window.setTimeout(() => {
      if (this.isAlive) this.element.classList.remove("ps--scrolling-" + axis);
    }, this.settings.scrollingThreshold);
  }
  move(name, amount) {
    const key = name === "X" ? "scrollLeft" : "scrollTop",
      before = this.element[key],
      range = this.axes[name].range;
    this.element[key] = clamp(
      before + amount,
      name === "X" && this.isRtl ? -range : 0,
      name === "X" && this.isRtl ? 0 : range,
    );
    this.sync();
    return this.element[key] !== before;
  }
  innerCanScroll(target, dx, dy) {
    for (
      let n = target?.nodeType === 1 ? target : target?.parentElement;
      n && n !== this.element;
      n = n.parentElement
    ) {
      const cs = this.window.getComputedStyle(n);
      if (
        dy &&
        /(auto|scroll)/.test(cs.overflowY) &&
        n.scrollHeight > n.clientHeight &&
        ((dy < 0 && n.scrollTop > 0) ||
          (dy > 0 && n.scrollTop < n.scrollHeight - n.clientHeight))
      )
        return true;
      if (
        dx &&
        /(auto|scroll)/.test(cs.overflowX) &&
        n.scrollWidth > n.clientWidth &&
        ((dx < 0 && n.scrollLeft > 0) ||
          (dx > 0 && n.scrollLeft < n.scrollWidth - n.clientWidth))
      )
        return true;
    }
    return false;
  }
  wheel(e) {
    if (e.defaultPrevented || e.ctrlKey) return;
    let dx = e.deltaX,
      dy = e.deltaY;
    const scale =
      e.deltaMode === 1 ? 10 : e.deltaMode === 2 ? this.containerHeight : 1;
    dx *= scale * this.settings.wheelSpeed;
    dy *= scale * this.settings.wheelSpeed;
    if (e.shiftKey && !dx) {
      dx = dy;
      dy = 0;
    }
    if (this.innerCanScroll(e.target, dx, dy)) return;
    if (this.settings.useBothWheelAxes) {
      if (this.scrollbarYActive && !this.scrollbarXActive) {
        dy = dy || dx;
        dx = 0;
      } else if (this.scrollbarXActive && !this.scrollbarYActive) {
        dx = dx || dy;
        dy = 0;
      }
    }
    const movedX = this.scrollbarXActive && dx ? this.move("X", dx) : false,
      movedY = this.scrollbarYActive && dy ? this.move("Y", dy) : false;
    if (movedX || movedY || !this.settings.wheelPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  key(e) {
    if (
      e.defaultPrevented ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      (!this.hover && !this.element.contains(this.ownerDocument.activeElement))
    )
      return;
    const focusedOwner = this.ownerDocument.activeElement?.closest?.(".ps");
    if (focusedOwner && focusedOwner !== this.element) return;
    if (this.hover && this.element.querySelector(".ps:hover")) return;
    const target = e.target;
    if (
      target?.isContentEditable ||
      target?.closest?.('input,textarea,select,button,[role="button"]')
    )
      return;
    const key =
      e.key ||
      {
        37: "ArrowLeft",
        38: "ArrowUp",
        39: "ArrowRight",
        40: "ArrowDown",
        32: " ",
        33: "PageUp",
        34: "PageDown",
        35: "End",
        36: "Home",
      }[e.keyCode];
    let axisName =
        this.ownerDocument.activeElement === this.scrollbarX ? "X" : "Y",
      amount;
    const page = axisName === "X" ? this.containerWidth : this.containerHeight,
      total = axisName === "X" ? this.contentWidth : this.contentHeight;
    if (key === "ArrowDown") {
      axisName = "Y";
      amount = 30;
    } else if (key === "ArrowUp") {
      axisName = "Y";
      amount = -30;
    } else if (key === "ArrowLeft") {
      axisName = "X";
      amount = -30;
    } else if (key === "ArrowRight") {
      axisName = "X";
      amount = 30;
    } else if (key === "PageDown" || key === " ")
      amount = page * (e.shiftKey ? -1 : 1);
    else if (key === "PageUp") amount = -page;
    else if (key === "Home")
      amount = -total * (axisName === "X" && this.isRtl ? -1 : 1);
    else if (key === "End")
      amount = total * (axisName === "X" && this.isRtl ? -1 : 1);
    else return;
    if (
      this.axes[axisName].active &&
      (this.move(axisName, amount) || !this.settings.wheelPropagation)
    )
      e.preventDefault();
  }
  startDrag(e, name) {
    if (e.button !== 0 || !this.axes[name].active) return;
    this.endDrag();
    const coordinate = name === "X" ? "clientX" : "clientY",
      key = name === "X" ? "scrollLeft" : "scrollTop",
      start = e[coordinate],
      origin = this.element[key],
      a = this.axes[name],
      id = e.pointerId;
    const move = (event) => {
      if (event.pointerId !== id) return;
      this.element[key] = clamp(
        origin +
          (event[coordinate] - start) * (a.travel ? a.range / a.travel : 0),
        name === "X" && this.isRtl ? -a.range : 0,
        name === "X" && this.isRtl ? 0 : a.range,
      );
      this.sync();
      event.preventDefault();
    };
    const end = (event) => {
      if (event.pointerId === id) this.endDrag();
    };
    this.drag = { move, end };
    this.ownerDocument.addEventListener("pointermove", move, {
      passive: false,
    });
    this.ownerDocument.addEventListener("pointerup", end);
    this.ownerDocument.addEventListener("pointercancel", end);
    this.element.classList.add("ps--clicking");
    this["scrollbar" + name].focus({ preventScroll: true });
    e.preventDefault();
    e.stopPropagation();
  }
  endDrag() {
    if (!this.drag) return;
    const { move, end } = this.drag;
    this.ownerDocument.removeEventListener("pointermove", move);
    this.ownerDocument.removeEventListener("pointerup", end);
    this.ownerDocument.removeEventListener("pointercancel", end);
    this.drag = null;
    this.element.classList.remove("ps--clicking");
  }
  destroy() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.endDrag();
    for (const remove of this.listeners) remove();
    this.listeners = [];
    this.resize?.disconnect();
    this.mutation?.disconnect();
    if (this.frame !== null) this.window.cancelAnimationFrame(this.frame);
    for (const id of Object.values(this.timers)) this.window.clearTimeout(id);
    this.scrollbarXRail.remove();
    this.scrollbarYRail.remove();
    for (const [name, had] of this.savedClasses)
      this.element.classList.toggle(name, had);
    if (this.ownedId && this.element.id === this.ownedId) {
      if (this.originalId === null) this.element.removeAttribute("id");
      else this.element.setAttribute("id", this.originalId);
    }
    live.delete(this.element);
  }
}
module.exports = PerfectScrollbar;
module.exports.default = PerfectScrollbar;
