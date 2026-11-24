"use strict";
const React = require("react");
const { createPortal } = require("react-dom");
const {
  autoUpdate,
  computePosition,
  flip,
  shift,
  limitShift,
} = require("vfloating-ui-dom");
const { unstable_useForkRef: useForkRef } = require("vmui-utils");
const { styled, useTheme, useThemeProps } = require("./theme.cjs");

const popperClasses = Object.freeze({ root: "MuiPopper-root" });
const getPopperUtilityClass = (slot) => "MuiPopper-" + slot;
const Root = styled("div", { name: "MuiPopper", slot: "Root" })({});
const layout =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

function swapAlignment(placement) {
  if (!/^(top|bottom)-/.test(placement)) return placement;
  return placement.endsWith("-start")
    ? placement.replace("-start", "-end")
    : placement.replace("-end", "-start");
}
// `open` keeps the panel positioned; `dormant` takes a retained panel out of
// layout. They differ while a transition child is still leaving.
function FloatingPanel({
  anchor,
  open,
  dormant,
  transitionProps,
  placement,
  rtl,
  rootRef,
  children,
  component,
  className,
  classes,
  style,
  ...props
}) {
  const element = React.useRef(null);
  const ref = useForkRef(element, rootRef);
  const [position, setPosition] = React.useState(null);
  layout(() => {
    const panel = element.current;
    if (!open || !anchor || !panel) return;
    const view = panel.ownerDocument.defaultView;
    // Floating UI interprets alignment using the floating element's direction.
    // Material's placement attribute uses physical Popper alignments.
    const cssRtl = view.getComputedStyle(panel).direction === "rtl";
    const initial = cssRtl !== rtl ? swapAlignment(placement) : placement;
    const middleware = [
      flip({ fallbackStrategy: "initialPlacement" }),
      shift({ limiter: limitShift() }),
    ];
    let latest = 0;
    const stop = autoUpdate(anchor, panel, () => {
      const request = ++latest;
      computePosition(anchor, panel, {
        placement: initial,
        strategy: "absolute",
        middleware,
      }).then((result) => {
        if (request !== latest) return;
        const dpr = view.devicePixelRatio || 1;
        const x = Math.round(result.x * dpr) / dpr;
        const y = Math.round(result.y * dpr) / dpr;
        const side = cssRtl
          ? swapAlignment(result.placement)
          : result.placement;
        setPosition((last) =>
          last?.x === x && last.y === y && last.side === side
            ? last
            : { x, y, side },
        );
      });
    });
    return () => {
      ++latest;
      stop();
    };
  }, [anchor, open, placement, rtl, component]);
  const side = position?.side ?? (rtl ? swapAlignment(placement) : placement);
  return React.createElement(
    Root,
    {
      role: "tooltip",
      ...props,
      as: component,
      ref,
      className: [popperClasses.root, classes?.root, className]
        .filter(Boolean)
        .join(" "),
      "data-popper-placement": position?.side,
      style: {
        position: position ? "absolute" : "fixed",
        top: 0,
        left: 0,
        ...(position && {
          transform: "translate(" + position.x + "px, " + position.y + "px)",
        }),
        ...(dormant && { display: "none" }),
        ...style,
      },
    },
    typeof children === "function"
      ? children({ placement: side, TransitionProps: transitionProps })
      : children,
  );
}

function resolve(value) {
  return typeof value === "function" ? value() : value;
}
function MountedPopper({ anchorEl, container, disablePortal, ...props }) {
  const [target, setTarget] = React.useState(null);
  layout(() => {
    const anchor = resolve(anchorEl);
    const host = disablePortal
      ? null
      : (resolve(container) ??
        (
          anchor?.ownerDocument ??
          anchor?.contextElement?.ownerDocument ??
          document
        ).body);
    if (!target || target.anchor !== anchor || target.host !== host)
      setTarget({ anchor, host });
  });
  const panel = React.createElement(FloatingPanel, {
    ...props,
    anchor: target?.anchor,
  });
  if (disablePortal) return panel;
  return target?.host ? createPortal(panel, target.host) : null;
}
const Popper = React.forwardRef(function Popper(input, ref) {
  const {
    keepMounted = false,
    open,
    placement = "bottom",
    transition = false,
    ...props
  } = useThemeProps({ props: input, name: "MuiPopper" });
  const theme = useTheme();
  // With `transition`, the child animates in and out and reports back; a
  // closing panel stays until the child's exit has finished.
  const [exited, setExited] = React.useState(true);
  const closed = !open && (!transition || exited);
  if (closed && !keepMounted) return null;
  return React.createElement(MountedPopper, {
    ...props,
    open: transition ? !exited : open,
    dormant: closed,
    transitionProps: transition
      ? {
          in: open,
          onEnter: () => setExited(false),
          onExited: () => setExited(true),
        }
      : undefined,
    placement,
    rootRef: ref,
    rtl: theme.direction === "rtl",
  });
});
module.exports = { Popper, popperClasses, getPopperUtilityClass };
