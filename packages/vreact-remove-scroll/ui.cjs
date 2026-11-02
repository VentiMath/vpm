"use strict";
const React = require("react");
const { useMergeRefs } = require("vuse-callback-ref");
const {
  fullWidthClassName,
  zeroRightClassName,
} = require("vreact-remove-scroll-bar/constants");
const medium = require("./medium.cjs");
const RemoveScroll = React.forwardRef(function RemoveScroll(props, ref) {
  const {
    children,
    sideCar: Sidecar,
    as: Container = "div",
    forwardProps = false,
    enabled = true,
    removeScrollBar = true,
    noRelative,
    noIsolation,
    inert = false,
    allowPinchZoom = false,
    shards,
    gapMode,
    ...rest
  } = props;
  const lockRef = React.useRef(null),
    [callbacks, setCallbacks] = React.useState({});
  const child = forwardProps ? React.Children.only(children) : null;
  const merged = useMergeRefs([lockRef, ref, child?.props.ref]);
  const attributes = { ...rest, ref: merged };
  for (const name of [
    "onScrollCapture",
    "onWheelCapture",
    "onTouchMoveCapture",
  ]) {
    const inherited = child?.props[name],
      own = rest[name],
      capture = callbacks[name];
    attributes[name] = (event) => {
      if (enabled) capture?.(event);
      inherited?.(event);
      if (own !== inherited) own?.(event);
    };
  }
  return React.createElement(
    React.Fragment,
    null,
    enabled &&
      Sidecar &&
      React.createElement(Sidecar, {
        sideCar: medium,
        lockRef,
        setCallbacks,
        removeScrollBar,
        noRelative,
        noIsolation,
        inert,
        allowPinchZoom,
        shards,
        gapMode,
      }),
    child
      ? React.cloneElement(child, attributes)
      : React.createElement(Container, attributes, children),
  );
});
RemoveScroll.classNames = {
  fullWidth: fullWidthClassName,
  zeroRight: zeroRightClassName,
};
exports.RemoveScroll = RemoveScroll;
