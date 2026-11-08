"use strict";
// Private controller: React owns its lifetime, a session owns one gesture.
module.exports = function createController(initialOptions) {
  let options = initialOptions,
    element = null,
    session = null;
  let removeTouch = () => {},
    removeMouse = () => {},
    touchKey = null,
    pendingNull = false;
  const value = (key, fallback) =>
    options[key] === undefined ? fallback : options[key];
  function cancel() {
    session = null;
    removeMouse();
  }
  function rotate(x, y) {
    const angle = (value("rotationAngle", 0) * Math.PI) / 180;
    if (!angle) return [x, y];
    const sin = Math.sin(angle),
      cos = Math.cos(angle);
    return [x * cos + y * sin, y * cos - x * sin];
  }
  function start(event, mouse) {
    if (pendingNull) return;
    if (mouse ? !value("trackMouse", false) : !value("trackTouch", true))
      return;
    if (!mouse && event.touches.length !== 1) {
      cancel();
      return;
    }
    if (mouse && event.button != null && event.button !== 0) return;
    cancel();
    const point = mouse ? event : event.touches[0],
      xy = rotate(point.clientX, point.clientY);
    session = {
      mouse,
      id: point.identifier,
      initial: xy,
      start: event.timeStamp,
      frame: null,
      expired: false,
    };
    if (mouse) {
      const doc =
        element?.ownerDocument ||
        event.currentTarget?.ownerDocument ||
        event.target?.ownerDocument;
      if (doc) {
        const win = doc.defaultView;
        doc.addEventListener("mousemove", move);
        doc.addEventListener("mouseup", end);
        win?.addEventListener("blur", cancel);
        removeMouse = () => {
          doc.removeEventListener("mousemove", move);
          doc.removeEventListener("mouseup", end);
          win?.removeEventListener("blur", cancel);
          removeMouse = () => {};
        };
      }
    }
    options.onTouchStartOrOnMouseDown?.({ event });
  }
  const mouseDown = (event) => start(event, true),
    touchStart = (event) => start(event, false);
  function payload(s, event) {
    const f = s.frame;
    return {
      absX: f.absX,
      absY: f.absY,
      deltaX: f.dx,
      deltaY: f.dy,
      dir: f.dir,
      event,
      first: f.first,
      initial: s.initial.slice(),
      velocity: f.velocity,
      vxvy: [f.vx, f.vy],
    };
  }
  function move(event) {
    const s = session;
    if (pendingNull || !s || s.expired) return;
    if (s.mouse !== !("touches" in event)) return;
    if (
      !s.mouse &&
      (event.touches.length !== 1 || event.touches[0].identifier !== s.id)
    ) {
      cancel();
      return;
    }
    if (event.timeStamp - s.start > value("swipeDuration", Infinity)) {
      s.expired = true;
      return;
    }
    const point = s.mouse ? event : event.touches[0],
      xy = rotate(point.clientX, point.clientY);
    const dx = xy[0] - s.initial[0],
      dy = xy[1] - s.initial[1],
      absX = Math.abs(dx),
      absY = Math.abs(dy);
    const dir =
      absX > absY ? (dx > 0 ? "Right" : "Left") : dy > 0 ? "Down" : "Up";
    const delta = value("delta", 10),
      threshold =
        typeof delta === "number" ? delta : (delta[dir.toLowerCase()] ?? 10);
    if (!s.frame && absX < threshold && absY < threshold) return;
    const elapsed = Math.max(1, event.timeStamp - s.start),
      first = !s.frame;
    s.frame = {
      absX,
      absY,
      dx,
      dy,
      dir,
      first,
      velocity: Math.sqrt(absX * absX + absY * absY) / elapsed,
      vx: dx / elapsed,
      vy: dy / elapsed,
    };
    const props = options;
    if (
      !s.mouse &&
      value("preventScrollOnSwipe", false) &&
      event.cancelable &&
      (props.onSwiping || props.onSwiped || props["onSwiped" + dir])
    )
      event.preventDefault();
    const data = payload(s, event);
    if (first) props.onSwipeStart?.(data);
    if (session === s && !pendingNull) props.onSwiping?.(data);
  }
  function end(event) {
    const s = session;
    if (pendingNull || !s || s.mouse !== !("touches" in event)) return;
    // Real TouchEvents identify the changed finger; minimal event shims may not.
    if (
      !s.mouse &&
      event.changedTouches?.length &&
      !Array.from(event.changedTouches).some((t) => t.identifier === s.id)
    )
      return;
    const props = options,
      expired =
        s.expired ||
        event.timeStamp - s.start >= value("swipeDuration", Infinity);
    session = null;
    removeMouse();
    if (!expired) {
      if (s.frame) {
        const data = payload(s, event);
        props.onSwiped?.(data);
        props["onSwiped" + s.frame.dir]?.(data);
      } else props.onTap?.({ event });
    }
    props.onTouchEndOrOnMouseUp?.({ event });
  }
  function detach() {
    removeTouch();
    removeTouch = () => {};
    touchKey = null;
    cancel();
  }
  function attach() {
    const passive = options.touchEventOptions?.passive ?? true,
      prevent = value("preventScrollOnSwipe", false),
      enabled = value("trackTouch", true);
    const key = enabled + ":" + passive + ":" + prevent;
    if (pendingNull || !element || touchKey === key) return;
    removeTouch();
    touchKey = key;
    if (!enabled) {
      removeTouch = () => {};
      if (session && !session.mouse) cancel();
      return;
    }
    const target = element,
      normal = { passive },
      moving = { passive: prevent ? false : passive };
    target.addEventListener("touchstart", touchStart, normal);
    target.addEventListener("touchmove", move, moving);
    target.addEventListener("touchend", end, normal);
    target.addEventListener("touchcancel", cancel, normal);
    removeTouch = () => {
      target.removeEventListener("touchstart", touchStart);
      target.removeEventListener("touchmove", move);
      target.removeEventListener("touchend", end);
      target.removeEventListener("touchcancel", cancel);
    };
  }
  const controller = {
    ref(node) {
      // Inline composing refs can detach and reattach the same node in one commit.
      // Suspend callbacks immediately; let that synchronous handoff preserve the gesture.
      if (node === null) {
        pendingNull = true;
        queueMicrotask(() => {
          if (pendingNull) {
            detach();
            element = null;
          }
        });
        return;
      }
      pendingNull = false;
      if (node === element) {
        attach();
        return;
      }
      detach();
      element = node;
      attach();
    },
    mouseDown,
    configure(next) {
      options = next;
      if (session?.mouse && !value("trackMouse", false)) cancel();
      attach();
    },
    suspend: detach,
  };
  return controller;
};
