import * as React from "react";
import { createPortal } from "react-dom";
import { tabbable, isFocusable } from "vtabbable";
import { useCommit, useCurrent, contains, focus, active } from "./shared.mjs";
const PortalContext = React.createContext(null);
const guardStyle = {
  position: "fixed",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
const isGuard = (node) => node.hasAttribute("data-floating-ui-focus-guard");
function candidates(root) {
  return root
    ? tabbable(root, {
        getShadowRoot: true,
        displayCheck:
          root.ownerDocument.defaultView.navigator.userAgent.includes("jsdom")
            ? "none"
            : "full",
      }).filter((node) => !isGuard(node))
    : [];
}
function adjacent(reference, container, forward) {
  const all = candidates(reference.ownerDocument.body).filter(
    (node) => !contains(container, node),
  );
  const index = all.indexOf(reference);
  return all[index + (forward ? 1 : -1)];
}
function Guard({ onFocus }) {
  return React.createElement("span", {
    "data-floating-ui-focus-guard": "",
    "aria-hidden": true,
    tabIndex: 0,
    style: guardStyle,
    onFocus,
  });
}
export function FloatingPortal({
  children,
  id,
  root,
  preserveTabOrder = true,
}) {
  const parent = React.useContext(PortalContext),
    [host, setHost] = React.useState(null),
    [manager, setManager] = React.useState(null);
  const generated = React.useId();
  useCommit(() => {
    const target =
      root === null
        ? null
        : (root && "current" in root ? root.current : root) ||
          parent?.host ||
          (typeof document !== "undefined" ? document.body : null);
    if (!target) return;
    const doc = target.ownerDocument,
      node = doc.createElement("div");
    node.setAttribute("data-floating-ui-portal", "");
    node.id = id || "floating-portal-" + generated;
    target.append(node);
    setHost(node);
    return () => {
      node.remove();
    };
  }, [root, id, parent?.host, generated]);
  const value = React.useMemo(() => ({ host, setManager }), [host]);
  const move = (forward, event) => {
    if (!manager) return;
    const { reference, floating } = manager;
    const fromInside = contains(floating, event.relatedTarget);
    const list = candidates(floating);
    focus(
      fromInside
        ? adjacent(reference, floating, forward)
        : (forward ? list.at(-1) : list[0]) || reference,
    );
  };
  return React.createElement(
    React.Fragment,
    null,
    preserveTabOrder && manager && !manager.modal
      ? React.createElement(Guard, { onFocus: (e) => move(false, e) })
      : null,
    host
      ? createPortal(
          React.createElement(PortalContext.Provider, { value }, children),
          host,
        )
      : null,
    preserveTabOrder && manager && !manager.modal
      ? React.createElement(Guard, { onFocus: (e) => move(true, e) })
      : null,
  );
}
const hidden = new WeakMap();
function hideOutside(document, protectedNodes) {
  const nodes = [];
  function visit(parent) {
    for (const node of parent.children) {
      if (protectedNodes.some((p) => p === node)) continue;
      if (protectedNodes.some((p) => contains(node, p))) visit(node);
      else if (
        !isGuard(node) &&
        !["SCRIPT", "STYLE", "LINK"].includes(node.tagName)
      ) {
        let record = hidden.get(node);
        if (!record) {
          record = {
            count: 0,
            inert: node.getAttribute("inert"),
            aria: node.getAttribute("aria-hidden"),
          };
          hidden.set(node, record);
          node.setAttribute("inert", "");
          node.setAttribute("aria-hidden", "true");
        }
        record.count++;
        nodes.push(node);
      }
    }
  }
  visit(document.body);
  return () => {
    for (const node of nodes) {
      const record = hidden.get(node);
      if (--record.count) continue;
      hidden.delete(node);
      for (const [key, value, current] of [
        ["inert", record.inert, ""],
        ["aria-hidden", record.aria, "true"],
      ])
        if (node.getAttribute(key) === current) {
          if (value === null) node.removeAttribute(key);
          else node.setAttribute(key, value);
        }
    }
  };
}
export function FloatingFocusManager({
  children,
  context,
  disabled = false,
  initialFocus = 0,
  returnFocus = true,
  restoreFocus = false,
  modal = true,
  guards = true,
  closeOnFocusOut = true,
  order = ["content"],
  getInsideElements = () => [],
  outsideElementsInert = false,
}) {
  const portal = React.useContext(PortalContext),
    settings = useCurrent({
      context,
      initialFocus,
      returnFocus,
      restoreFocus,
      modal,
      closeOnFocusOut,
      order,
      getInsideElements,
    }),
    floating = context.elements.floating,
    reference = context.elements.domReference;
  const focusEnd = (forward) => {
    const list = candidates(floating);
    focus((forward ? list[0] : list.at(-1)) || floating);
  };
  useCommit(() => {
    if (disabled || !context.open || !floating) return;
    const doc = floating.ownerDocument,
      previous = active(doc);
    let stopped = false,
      observer;
    const originalIndex = floating.getAttribute("tabindex");
    if (originalIndex == null) floating.tabIndex = -1;
    const inside = (node) =>
      contains(floating, node) ||
      contains(reference, node) ||
      settings.current.getInsideElements().some((el) => contains(el, node));
    const stopHide =
      modal || outsideElementsInert
        ? hideOutside(
            doc,
            [floating, reference, ...getInsideElements()].filter(Boolean),
          )
        : () => {};
    portal?.setManager({ reference, floating, modal });
    const list = () => {
      const result = [];
      for (const part of settings.current.order) {
        if (part === "reference" && reference) result.push(reference);
        else if (part === "floating") result.push(floating);
        else if (part === "content") result.push(...candidates(floating));
      }
      return result;
    };
    // A cancellable microtask cannot focus a stale element after close or StrictMode cleanup.
    queueMicrotask(() => {
      if (stopped || settings.current.initialFocus < 0) return;
      const value = settings.current.initialFocus,
        target =
          typeof value === "object" ? value.current : list()[value] || floating;
      if (!contains(floating, active(doc))) focus(target);
    });
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = list(),
        current = active(doc),
        index = items.indexOf(current);
      if (settings.current.modal) {
        if (
          index < 0 ||
          (e.shiftKey && index === 0) ||
          (!e.shiftKey && index === items.length - 1)
        ) {
          e.preventDefault();
          focus((e.shiftKey ? items.at(-1) : items[0]) || floating);
        }
      } else if (
        contains(floating, current) &&
        ((e.shiftKey && index <= 0) ||
          (!e.shiftKey && index === items.length - 1))
      ) {
        const target = e.shiftKey
          ? reference
          : reference && adjacent(reference, floating, true);
        if (target) {
          e.preventDefault();
          focus(target);
        }
      }
    };
    const onFocus = (e) => {
      if (inside(e.target) || isGuard(e.target)) return;
      if (settings.current.modal) {
        focus(list()[0] || floating);
      } else if (settings.current.closeOnFocusOut)
        settings.current.context.onOpenChange(false, e, "focus-out");
    };
    doc.addEventListener("keydown", onKey, true);
    doc.addEventListener("focusin", onFocus);
    if (restoreFocus && doc.defaultView.MutationObserver) {
      observer = new doc.defaultView.MutationObserver(() => {
        if (!stopped && active(doc) === doc.body)
          focus(candidates(floating)[0] || floating);
      });
      observer.observe(floating, { subtree: true, childList: true });
    }
    return () => {
      stopped = true;
      observer?.disconnect();
      doc.removeEventListener("keydown", onKey, true);
      doc.removeEventListener("focusin", onFocus);
      stopHide();
      portal?.setManager(null);
      if (originalIndex == null && floating.getAttribute("tabindex") === "-1")
        floating.removeAttribute("tabindex");
      const config = settings.current,
        shouldReturn = config.returnFocus;
      queueMicrotask(() => {
        const now = active(doc);
        if (!shouldReturn || (now !== doc.body && !contains(floating, now)))
          return;
        const destination =
          typeof shouldReturn === "object"
            ? shouldReturn.current
            : reference?.isConnected
              ? reference
              : previous;
        if (destination?.isConnected) focus(destination);
      });
    };
  }, [
    disabled,
    context.open,
    floating,
    reference,
    modal,
    outsideElementsInert,
    restoreFocus,
    portal,
    settings,
  ]);
  return React.createElement(
    React.Fragment,
    null,
    !disabled && guards
      ? React.createElement(Guard, {
          onFocus: () => (modal ? focusEnd(false) : focus(reference)),
        })
      : null,
    children,
    !disabled && guards
      ? React.createElement(Guard, {
          onFocus: () =>
            modal
              ? focusEnd(true)
              : focus(reference && adjacent(reference, floating, true)),
        })
      : null,
  );
}
