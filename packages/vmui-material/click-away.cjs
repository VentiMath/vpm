"use strict";
const React = require("react");
const {
  unstable_useEventCallback: useEventCallback,
  unstable_useForkRef: useForkRef,
} = require("vmui-utils");

function ClickAwayListener({
  children,
  onClickAway,
  mouseEvent = "onClick",
  touchEvent = "onTouchEnd",
  disableReactTree = false,
}) {
  const active = React.useRef(false);
  const insideEvent = React.useRef(null);
  const notify = useEventCallback(onClickAway);
  React.useEffect(() => {
    // A click that opens the search can reach its document after React mounts it.
    const timer = setTimeout(() => {
      active.current = true;
    }, 0);
    return () => {
      clearTimeout(timer);
      active.current = false;
    };
  }, []);

  const subscribe = React.useCallback(
    (node) => {
      const doc = node.ownerDocument;
      let moved = false;
      const move = () => {
        moved = true;
      };
      function check(event) {
        if (event.type.startsWith("touch") && moved) {
          moved = false;
          return;
        }
        if (
          !active.current ||
          (!disableReactTree && insideEvent.current === event)
        )
          return;
        const viewport = doc.documentElement;
        if (
          event.clientX > viewport.clientWidth ||
          event.clientY > viewport.clientHeight
        )
          return;
        if (
          event.composedPath
            ? event.composedPath().includes(node)
            : !viewport.contains(event.target) || node.contains(event.target)
        )
          return;
        notify(event);
      }
      const mouse = mouseEvent && mouseEvent.slice(2).toLowerCase();
      const touch = touchEvent && touchEvent.slice(2).toLowerCase();
      if (mouse) doc.addEventListener(mouse, check);
      if (touch) {
        doc.addEventListener(touch, check);
        doc.addEventListener("touchmove", move);
      }
      return () => {
        if (mouse) doc.removeEventListener(mouse, check);
        if (touch) {
          doc.removeEventListener(touch, check);
          doc.removeEventListener("touchmove", move);
        }
        insideEvent.current = null;
      };
    },
    [mouseEvent, touchEvent, disableReactTree, notify],
  );

  const props = { ref: useForkRef(subscribe, children.props.ref) };
  // Synthetic events also bubble from portals whose DOM lives outside the child.
  for (const name of [mouseEvent, touchEvent])
    if (name) {
      props[name] = (event) => {
        insideEvent.current = event.nativeEvent;
        children.props[name]?.(event);
      };
    }
  return React.cloneElement(children, props);
}
module.exports = { ClickAwayListener };
