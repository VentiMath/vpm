"use strict";
const React = require("react");
const { RemoveScrollBar } = require("vreact-remove-scroll-bar");
const { styleSingleton } = require("vreact-style-singleton");
const { register, element } = require("./controller.cjs");
let nextId = 0;
module.exports = function ScrollEffects(props) {
  const [lock] = React.useState(() => ({
    ref: props.lockRef,
    props,
    captured: new WeakSet(),
    touch: [0, 0],
  }));
  const [id] = React.useState(() => ++nextId);
  const [Style] = React.useState(styleSingleton);
  const inert = React.useRef({ nodes: [], body: null });
  const clearInert = () => {
    inert.current.body?.classList.remove("block-interactivity-" + id);
    for (const node of inert.current.nodes)
      node.classList.remove("allow-interactivity-" + id);
    inert.current = { nodes: [], body: null };
  };
  React.useLayoutEffect(() => {
    lock.props = props;
    const body = props.inert ? props.lockRef.current?.ownerDocument.body : null;
    const nodes = body
      ? [props.lockRef.current, ...(props.shards || []).map(element)].filter(
          Boolean,
        )
      : [];
    if (
      body === inert.current.body &&
      nodes.length === inert.current.nodes.length &&
      nodes.every((node, i) => node === inert.current.nodes[i])
    )
      return;
    clearInert();
    if (body) {
      body.classList.add("block-interactivity-" + id);
      for (const node of nodes) node.classList.add("allow-interactivity-" + id);
      inert.current = { body, nodes };
    }
  });
  React.useEffect(() => {
    const capture = (event) => lock.captured.add(event.nativeEvent || event);
    props.setCallbacks({
      onScrollCapture: capture,
      onWheelCapture: capture,
      onTouchMoveCapture: capture,
    });
    const remove = register(lock);
    return () => {
      remove();
      clearInert();
    };
  }, [lock]);
  return React.createElement(
    React.Fragment,
    null,
    props.inert &&
      React.createElement(Style, {
        styles: `.block-interactivity-${id}{pointer-events:none}.allow-interactivity-${id}{pointer-events:all}`,
      }),
    props.removeScrollBar &&
      React.createElement(RemoveScrollBar, {
        noRelative: props.noRelative,
        gapMode: props.gapMode,
      }),
  );
};
