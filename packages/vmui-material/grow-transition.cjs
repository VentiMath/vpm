"use strict";
const React = require("react");
const { Transition } = require("vreact-transition-group");
const { unstable_useForkRef: useForkRef } = require("vmui-utils");
const { useTheme } = require("./theme.cjs");

const small = "scale(0.75, 0.5625)";
const standard = "cubic-bezier(0.4, 0, 0.2, 1)";
function autoDuration(height) {
  if (!height) return 0;
  const units = height / 36;
  return Math.min(
    3000,
    Math.round(40 + 150 * Math.sqrt(Math.sqrt(units)) + 2 * units),
  );
}
function time(value) {
  return typeof value === "number" ? Math.round(value) + "ms" : value;
}
function milliseconds(value) {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return value.endsWith("ms") ? n : n * 1000;
}
const Grow = React.forwardRef(function Grow(props, forwardedRef) {
  const {
    children,
    in: open = false,
    appear = true,
    enter = true,
    exit = true,
    mountOnEnter,
    unmountOnExit,
    timeout = "auto",
    easing,
    style,
    disablePrefersReducedMotion = false,
    addEndListener,
    onEnter,
    onEntering,
    onEntered,
    onExit,
    onExiting,
    onExited,
    ...childProps
  } = props;
  const theme = useTheme(),
    node = React.useRef(null),
    duration = React.useRef(0),
    timer = React.useRef();
  const ref = useForkRef(node, forwardedRef, children.props.ref);
  function clear() {
    clearTimeout(timer.current);
  }
  React.useEffect(() => clear, []);
  function configure(phase, appearing) {
    clear();
    const el = node.current,
      transition = theme.transitions;
    const motion = theme.motion?.reducedMotion;
    const reduce =
      !disablePrefersReducedMotion &&
      (motion === "always" ||
        (motion === "system" &&
          el.ownerDocument.defaultView?.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
          ).matches));
    let ms;
    if (reduce) ms = 0;
    else if (timeout === "auto")
      ms = (transition?.getAutoHeightDuration ?? autoDuration)(el.clientHeight);
    else if (typeof timeout === "number") ms = timeout;
    else
      ms =
        (appearing ? (timeout.appear ?? timeout.enter) : timeout[phase]) ?? 0;
    duration.current = ms;
    const opacity =
      reduce || timeout === "auto" ? ms : (style?.transitionDuration ?? ms);
    const scale = (milliseconds(opacity) * 2) / 3;
    const curve =
      style?.transitionTimingFunction ??
      (typeof easing === "string" ? easing : easing?.[phase]) ??
      transition?.easing?.easeInOut ??
      standard;
    const delay = reduce ? 0 : style?.transitionDelay;
    const rule = (prop, length, lag) =>
      transition?.create?.(prop, {
        duration: length,
        easing: curve,
        delay: lag,
      }) ?? prop + " " + time(length) + " " + curve + " " + time(lag);
    el.style.transition = [
      rule("opacity", opacity, delay ?? 0),
      rule(
        "transform",
        scale,
        delay ?? (phase === "exit" ? milliseconds(opacity) / 3 : 0),
      ),
    ].join(",");
  }
  return React.createElement(
    Transition,
    {
      nodeRef: node,
      in: open,
      appear,
      enter,
      exit,
      mountOnEnter,
      unmountOnExit,
      timeout: null,
      onEnter(appearing) {
        void node.current.scrollTop;
        configure("enter", appearing);
        onEnter?.(node.current, appearing);
      },
      onEntering(appearing) {
        onEntering?.(node.current, appearing);
      },
      onEntered(appearing) {
        clear();
        onEntered?.(node.current, appearing);
      },
      onExit() {
        configure("exit", false);
        node.current.style.opacity = "0";
        node.current.style.transform = small;
        onExit?.(node.current);
      },
      onExiting() {
        onExiting?.(node.current);
      },
      onExited() {
        clear();
        node.current.style.transition =
          children.props.style?.transition ?? style?.transition ?? "";
        onExited?.(node.current);
      },
      addEndListener(done) {
        timer.current = setTimeout(done, duration.current);
        addEndListener?.(node.current, done);
      },
    },
    (state) => {
      const visible = state === "entered" || state === "entering";
      return React.cloneElement(children, {
        ref,
        style: {
          opacity: visible ? 1 : 0,
          transform:
            state === "entered" ? "none" : visible ? "scale(1, 1)" : small,
          ...(state === "exited" && !open ? { visibility: "hidden" } : {}),
          ...style,
          ...children.props.style,
        },
        ...childProps,
      });
    },
  );
});
Grow.muiSupportAuto = true;
module.exports = { Grow };
