import * as React from "react";
import {
  useCommit,
  useCurrent,
  useEvent,
  native,
  inside,
  contains,
  editable,
  active,
  emitter,
} from "./shared.mjs";
const empty = {};
export function useClick(context, options = {}) {
  const state = useCurrent({ context, options }),
    pointer = React.useRef(),
    space = React.useRef(false);
  const press = useEvent((event, keyboard = false) => {
    const { context: c, options: o } = state.current,
      e = native(event);
    if (
      !keyboard &&
      o.ignoreMouse &&
      (pointer.current == null ||
        pointer.current === "mouse" ||
        pointer.current === "pen")
    )
      return;
    const previous = c.dataRef.current.openEvent;
    const close =
      c.open &&
      o.toggle !== false &&
      (keyboard ||
        o.stickIfOpen === false ||
        !previous ||
        previous.type === e.type);
    if (e.type === "mousedown" && !close) event.preventDefault();
    c.onOpenChange(!close, e, "click");
  });
  const reference = React.useMemo(
    () => ({
      onPointerDown: (e) => {
        pointer.current = e.pointerType;
      },
      onMouseDown: (e) => {
        if (e.button === 0 && state.current.options.event === "mousedown")
          press(e);
      },
      onClick: (e) => {
        if (state.current.options.event === "mousedown" && pointer.current) {
          pointer.current = undefined;
          return;
        }
        press(e);
      },
      onKeyDown: (e) => {
        pointer.current = undefined;
        if (
          e.defaultPrevented ||
          state.current.options.keyboardHandlers === false ||
          e.target.tagName === "BUTTON"
        )
          return;
        if (e.key === " " && !editable(e.target)) {
          e.preventDefault();
          space.current = true;
        }
        if (e.key === "Enter" && e.target.tagName !== "A") press(e, true);
      },
      onKeyUp: (e) => {
        if (
          e.key === " " &&
          space.current &&
          !e.defaultPrevented &&
          state.current.options.keyboardHandlers !== false &&
          e.target.tagName !== "BUTTON" &&
          !editable(e.target)
        ) {
          space.current = false;
          press(e, true);
        }
      },
    }),
    [state, press],
  );
  return options.enabled === false ? empty : { reference };
}
const layers = new WeakMap();
export function useDismiss(context, options = {}) {
  const current = useCurrent({ context, options });
  const dismiss = useEvent((event, reason) => {
    const { context: c } = current.current;
    c.onOpenChange(false, native(event), reason);
  });
  React.useEffect(() => {
    if (!context.open || options.enabled === false) return;
    const doc =
      context.elements.floating?.ownerDocument ||
      context.elements.domReference?.ownerDocument;
    if (!doc) return;
    let stack = layers.get(doc);
    if (!stack) layers.set(doc, (stack = []));
    const layer = context.dataRef;
    stack.push(layer);
    const close = (e) => {
      const { context: c, options: o } = current.current;
      if (!c.open || stack.at(-1) !== layer) return;
      if (e.type === "keydown") {
        if (o.escapeKey !== false && e.key === "Escape" && !e.isComposing) {
          e.stopPropagation();
          dismiss(e, "escape-key");
        }
        return;
      }
      if (
        o.outsidePress === false ||
        (typeof o.outsidePress === "function" && !o.outsidePress(e)) ||
        inside(c.elements.floating, e) ||
        inside(c.elements.domReference, e)
      )
        return;
      dismiss(e, "outside-press");
    };
    const press = options.outsidePressEvent || "pointerdown";
    const capture =
      typeof options.capture === "object"
        ? options.capture.outsidePress
        : !!options.capture;
    doc.addEventListener(
      "keydown",
      close,
      !!(typeof options.capture === "object"
        ? options.capture.escapeKey
        : options.capture),
    );
    doc.addEventListener(press, close, capture);
    const scroll = (e) => {
      if (!inside(context.elements.floating, e)) dismiss(e, "ancestor-scroll");
    };
    if (options.ancestorScroll) doc.addEventListener("scroll", scroll, true);
    return () => {
      const at = stack.indexOf(layer);
      if (at >= 0) stack.splice(at, 1);
      doc.removeEventListener(
        "keydown",
        close,
        !!(typeof options.capture === "object"
          ? options.capture.escapeKey
          : options.capture),
      );
      doc.removeEventListener(press, close, capture);
      doc.removeEventListener("scroll", scroll, true);
    };
  }, [
    context.open,
    context.elements.floating,
    context.elements.domReference,
    context.dataRef,
    options.enabled,
    options.outsidePressEvent,
    options.capture,
    options.ancestorScroll,
    current,
    dismiss,
  ]);
  const reference = React.useMemo(
    () => ({
      [options.referencePressEvent === "click"
        ? "onClick"
        : options.referencePressEvent === "mousedown"
          ? "onMouseDown"
          : "onPointerDown"]: (e) => {
        if (current.current.options.referencePress)
          dismiss(e, "reference-press");
      },
    }),
    [options.referencePressEvent, current, dismiss],
  );
  return options.enabled === false ? empty : { reference };
}
export function useFocus(context, options = {}) {
  const state = useCurrent({ context, options }),
    blocked = React.useRef(false),
    sequence = React.useRef(0);
  React.useEffect(() => {
    if (options.enabled === false) return;
    const changed = ({ reason }) => {
      if (reason === "escape-key" || reason === "reference-press")
        blocked.current = true;
    };
    context.events.on("openchange", changed);
    return () => {
      context.events.off("openchange", changed);
      sequence.current++;
    };
  }, [context.events, options.enabled]);
  const reference = React.useMemo(
    () => ({
      onMouseLeave: () => {
        blocked.current = false;
      },
      onFocus: (e) => {
        const { context: c, options: o } = state.current;
        if (blocked.current) return;
        if (o.visibleOnly !== false && !e.target.matches(":focus-visible"))
          return;
        c.onOpenChange(true, native(e), "focus");
      },
      onBlur: (e) => {
        blocked.current = false;
        const ticket = ++sequence.current,
          event = native(e),
          related = e.relatedTarget;
        queueMicrotask(() => {
          if (ticket !== sequence.current) return;
          const { context: c, options: o } = state.current;
          if (o.enabled === false) return;
          const doc = c.elements.domReference?.ownerDocument;
          if (!doc) return;
          const target = active(doc);
          if (
            contains(c.elements.floating, target) ||
            contains(c.elements.domReference, target) ||
            (!related && target === c.elements.domReference)
          )
            return;
          c.onOpenChange(false, event, "focus");
        });
      },
    }),
    [state],
  );
  return options.enabled === false ? empty : { reference };
}
const DelayContext = React.createContext(null);
export function FloatingDelayGroup({ children, delay, timeoutMs = 0 }) {
  const [currentId, setCurrentId] = React.useState(null),
    timer = React.useRef();
  const change = useEvent((id) => {
    clearTimeout(timer.current);
    if (id != null) setCurrentId(id);
    else timer.current = setTimeout(() => setCurrentId(null), timeoutMs);
  });
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const value = React.useMemo(
    () => ({
      delay,
      currentId,
      setCurrentId: change,
      isInstantPhase: currentId != null,
    }),
    [delay, currentId, change],
  );
  return React.createElement(DelayContext.Provider, { value }, children);
}
export function useDelayGroupContext() {
  return (
    React.useContext(DelayContext) || {
      delay: 0,
      currentId: null,
      setCurrentId: () => {},
      isInstantPhase: false,
    }
  );
}
export function useDelayGroup(
  context,
  { id = context.floatingId, enabled = true } = {},
) {
  const group = useDelayGroupContext(),
    latest = useCurrent(group),
    previousId = React.useRef(group.currentId);
  React.useEffect(() => {
    if (!enabled) return;
    if (context.open) group.setCurrentId(id);
    else if (latest.current.currentId === id) group.setCurrentId(null);
  }, [context.open, enabled, id, group.setCurrentId, latest]);
  React.useEffect(() => {
    const changed = previousId.current !== group.currentId;
    previousId.current = group.currentId;
    if (
      changed &&
      enabled &&
      context.open &&
      group.currentId != null &&
      group.currentId !== id
    )
      context.onOpenChange(false, undefined, "hover");
  }, [enabled, context.open, context.onOpenChange, group.currentId, id]);
  return group;
}
export function useHover(context, options = {}) {
  const state = useCurrent({ context, options }),
    timer = React.useRef(),
    pointer = React.useRef("mouse"),
    blocked = React.useRef(false),
    group = React.useContext(DelayContext);
  const cancel = React.useCallback(() => clearTimeout(timer.current), []);
  const schedule = useEvent((open, event) => {
    cancel();
    const { context: c, options: o } = state.current;
    if (o.enabled === false || (o.mouseOnly && pointer.current !== "mouse"))
      return;
    if (
      !open &&
      ["click", "mousedown"].includes(c.dataRef.current.openEvent?.type)
    )
      return;
    const config = o.delay ?? group?.delay ?? 0,
      wait = open
        ? group?.currentId && group.currentId !== c.floatingId
          ? 1
          : (typeof config === "number" ? config : config.open || 0) ||
            o.restMs ||
            0
        : typeof config === "number"
          ? 0
          : config.close || 0;
    const run = () => {
      if (state.current.options.enabled !== false)
        c.onOpenChange(open, event, "hover");
    };
    if (wait) timer.current = setTimeout(run, wait);
    else run();
  });
  React.useEffect(() => {
    cancel();
    if (options.enabled === false) return;
    const reference = context.elements.domReference,
      floating = context.elements.floating;
    if (!reference) return;
    const enter = (e) => {
        blocked.current = false;
        schedule(true, e);
      },
      leave = (e) => {
        if (
          !contains(floating, e.relatedTarget) &&
          !contains(reference, e.relatedTarget)
        )
          schedule(false, e);
      },
      move = (e) => {
        const { context: c, options: o } = state.current;
        if (!blocked.current && !c.open && (o.move !== false || o.restMs > 0))
          schedule(true, e);
      };
    reference.addEventListener("mouseenter", enter);
    reference.addEventListener("mouseleave", leave);
    reference.addEventListener("mousemove", move);
    floating?.addEventListener("mouseenter", cancel);
    floating?.addEventListener("mouseleave", leave);
    const change = ({ open, reason }) => {
      if (!open) {
        cancel();
        if (reason === "escape-key") blocked.current = true;
      }
    };
    context.events.on("openchange", change);
    return () => {
      cancel();
      reference.removeEventListener("mouseenter", enter);
      reference.removeEventListener("mouseleave", leave);
      reference.removeEventListener("mousemove", move);
      floating?.removeEventListener("mouseenter", cancel);
      floating?.removeEventListener("mouseleave", leave);
      context.events.off("openchange", change);
    };
  }, [
    context.elements.domReference,
    context.elements.floating,
    context.events,
    options.enabled,
    cancel,
    schedule,
    state,
  ]);
  const reference = React.useMemo(
    () => ({
      onPointerDown: (e) => {
        pointer.current = e.pointerType || "mouse";
      },
      onPointerMove: (e) => {
        pointer.current = e.pointerType || "mouse";
      },
    }),
    [],
  );
  return options.enabled === false ? empty : { reference };
}
export function useRole(context, { role = "dialog", enabled = true } = {}) {
  const generated = React.useId(),
    referenceId =
      context.elements.domReference?.id || "floating-ref-" + generated,
    floatingId = context.elements.floating?.id || context.floatingId;
  const mapped = role === "select" || role === "combobox" ? "listbox" : role;
  const reference = React.useMemo(
    () =>
      role === "tooltip" || role === "label"
        ? {
            [role === "label" ? "aria-labelledby" : "aria-describedby"]:
              context.open ? floatingId : undefined,
          }
        : {
            "aria-expanded": context.open ? "true" : "false",
            "aria-haspopup": mapped === "alertdialog" ? "dialog" : mapped,
            "aria-controls": context.open ? floatingId : undefined,
            ...(mapped === "menu" ? { id: referenceId } : {}),
            ...(mapped === "listbox" ? { role: "combobox" } : {}),
            ...(role === "select"
              ? { "aria-autocomplete": "none" }
              : role === "combobox"
                ? { "aria-autocomplete": "list" }
                : {}),
          },
    [role, mapped, context.open, floatingId, referenceId],
  );
  const floating = React.useMemo(
    () => ({
      id: floatingId,
      ...(role === "label" ? {} : { role: mapped }),
      ...(mapped === "menu" ? { "aria-labelledby": referenceId } : {}),
    }),
    [floatingId, role, mapped, referenceId],
  );
  const item = React.useCallback(
    ({ active, selected }) =>
      role === "select" || role === "combobox"
        ? {
            role: "option",
            ...(active ? { id: floatingId + "-fui-option" } : {}),
            "aria-selected": selected,
          }
        : {},
    [role, floatingId],
  );
  return enabled ? { reference, floating, item } : empty;
}
