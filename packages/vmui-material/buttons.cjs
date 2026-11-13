"use strict";
const React = require("react");
const system = require("vmui-system");
const h = React.createElement;
const empty = Object.freeze({});
const upper = (s) => s[0].toUpperCase() + s.slice(1);
const join = (...values) => values.filter(Boolean).join(" ");
const states = new Set(["disabled", "focusVisible", "selected"]);
const utility = (name, slot) =>
  states.has(slot) ? "Mui-" + slot : name + "-" + slot;
const classesFor = (name, slots, custom = empty) =>
  slots
    .filter(Boolean)
    .map((slot) => join(utility(name, slot), custom[slot]))
    .join(" ");
const fallbackPalette = {
  primary: { main: "#1976d2", dark: "#1565c0", contrastText: "#fff" },
  secondary: { main: "#9c27b0", dark: "#7b1fa2", contrastText: "#fff" },
  error: { main: "#d32f2f", dark: "#c62828", contrastText: "#fff" },
  warning: { main: "#ed6c02", dark: "#e65100", contrastText: "#fff" },
  info: { main: "#0288d1", dark: "#01579b", contrastText: "#fff" },
  success: { main: "#2e7d32", dark: "#1b5e20", contrastText: "#fff" },
  action: {
    active: "rgba(0,0,0,.54)",
    disabled: "rgba(0,0,0,.26)",
    disabledBackground: "rgba(0,0,0,.12)",
    hoverOpacity: 0.04,
    selectedOpacity: 0.08,
  },
  text: { primary: "rgba(0,0,0,.87)" },
};
function palette(theme) {
  return theme.vars?.palette || theme.palette || fallbackPalette;
}
function color(theme, name) {
  const p = palette(theme);
  return Object.hasOwn(p, name) ? p[name] : fallbackPalette[name];
}
// Relative color replaces the alpha channel instead of multiplying an existing
// alpha (text.primary is already translucent). CSS-variable opacity stays live.
const tint = (value, opacity) => `rgb(from ${value} r g b / ${opacity})`;
const defaults = (props, name) => {
  const resolved = system.useThemeProps({ props, name, themeId: "$$material" });
  let result = resolved;
  for (const key of Object.keys(resolved))
    if (resolved[key] === undefined) {
      if (result === resolved) result = { ...resolved };
      delete result[key];
    }
  return result;
};
const styled = system.createStyled({ themeId: "$$material" });
const baseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxSizing: "border-box",
  WebkitTapHighlightColor: "transparent",
  backgroundColor: "transparent",
  outline: 0,
  border: 0,
  margin: 0,
  borderRadius: 0,
  padding: 0,
  cursor: "pointer",
  userSelect: "none",
  verticalAlign: "middle",
  MozAppearance: "none",
  WebkitAppearance: "none",
  textDecoration: "none",
  color: "inherit",
  font: "inherit",
  "&::-moz-focus-inner": { borderStyle: "none" },
  "&.Mui-disabled": { pointerEvents: "none", cursor: "default" },
  "@media print": { printColorAdjust: "exact" },
};
const BaseRoot = styled("button", {
  name: "MuiButtonBase",
  slot: "Root",
  overridesResolver: (_, s) => s.root,
})(baseStyle);
function useRefs(...refs) {
  return React.useMemo(
    () => (node) => {
      const cleanups = refs.map((ref) =>
        typeof ref === "function"
          ? ref(node)
          : ref && ((ref.current = node), undefined),
      );
      return () =>
        refs.forEach((ref, i) => {
          if (typeof cleanups[i] === "function") cleanups[i]();
          else if (typeof ref === "function") ref(null);
          else if (ref) ref.current = null;
        });
    },
    refs,
  );
}
// Ripple state is local to its host; there are no document listeners or shared
// timers. CSS animation handles painting, and unmount owns every timeout.
const Ripple = React.forwardRef(function Ripple(_, ref) {
  const [waves, setWaves] = React.useState([]),
    next = React.useRef(0),
    timers = React.useRef(new Set());
  React.useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );
  React.useImperativeHandle(
    ref,
    () => ({
      start(event, options = {}, callback) {
        const host = event?.currentTarget,
          rect = host?.getBoundingClientRect?.() || {
            width: 0,
            height: 0,
            left: 0,
            top: 0,
          };
        const point = event?.touches?.[0] || event;
        const centered = options.center || (!point?.clientX && !point?.clientY);
        const x = centered ? rect.width / 2 : point.clientX - rect.left;
        const y = centered ? rect.height / 2 : point.clientY - rect.top;
        const diameter =
          2 *
          Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
        const wave = { id: next.current++, x, y, diameter, leaving: false };
        setWaves((old) => [...old, wave]);
        callback?.();
      },
      stop(_, callback) {
        setWaves((old) => old.map((w) => ({ ...w, leaving: true })));
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          setWaves((old) => old.filter((w) => !w.leaving));
          callback?.();
        }, 450);
        timers.current.add(timer);
      },
      pulsate() {
        setWaves([{ id: next.current++, pulse: true }]);
      },
    }),
    [],
  );
  return h(
    "span",
    {
      className: "MuiTouchRipple-root",
      "aria-hidden": true,
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        pointerEvents: "none",
      },
    },
    waves.map((w) =>
      h("span", {
        key: w.id,
        className: join(
          "MuiTouchRipple-ripple MuiTouchRipple-rippleVisible",
          w.leaving && "MuiTouchRipple-childLeaving",
          w.pulse && "MuiTouchRipple-ripplePulsate",
        ),
        style: {
          position: "absolute",
          display: "block",
          borderRadius: "50%",
          backgroundColor: "currentColor",
          width: w.diameter || "100%",
          height: w.diameter || "100%",
          left: w.pulse ? 0 : w.x - w.diameter / 2,
          top: w.pulse ? 0 : w.y - w.diameter / 2,
          opacity: w.leaving ? 0 : 0.18,
          transform: "scale(1)",
          transition: "opacity 450ms ease-out",
        },
      }),
    ),
  );
});
const ButtonBase = React.forwardRef(function ButtonBase(input, forwardedRef) {
  const p = defaults(input, "MuiButtonBase");
  const {
    action,
    children,
    classes = empty,
    className,
    component: Component = "button",
    disabled = false,
    disableRipple = false,
    disableFocusRipple,
    disableTouchRipple = false,
    focusRipple = false,
    centerRipple = false,
    focusVisibleClassName,
    LinkComponent = "a",
    onBlur,
    onFocus,
    onFocusVisible,
    onClick,
    onKeyDown,
    onKeyUp,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onContextMenu,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    touchRippleRef,
    TouchRippleProps,
    tabIndex = 0,
    type,
    ...rest
  } = p;
  const [focused, setFocused] = React.useState(false),
    node = React.useRef(null),
    ripple = React.useRef(null);
  const ref = useRefs(node, forwardedRef),
    rippleRef = useRefs(ripple, touchRippleRef);
  const focusVisible = focused && !disabled;
  React.useImperativeHandle(
    action,
    () => ({
      focusVisible() {
        if (!disabled) {
          setFocused(true);
          node.current?.focus();
        }
      },
    }),
    [disabled],
  );
  React.useEffect(() => {
    if (disabled) setFocused(false);
  }, [disabled]);
  React.useEffect(() => {
    if (focusVisible && focusRipple && !disableRipple)
      ripple.current?.pulsate();
  }, [focusVisible, focusRipple, disableRipple]);
  if (TouchRippleProps && Object.keys(TouchRippleProps).length)
    throw new TypeError(
      "Custom TouchRipple props are outside the button contract",
    );
  const Tag =
    Component === "button" && (rest.href || rest.to)
      ? LinkComponent
      : Component;
  const native = (el) =>
    el?.tagName === "BUTTON" ||
    (el?.tagName === "A" && el.hasAttribute("href")) ||
    el?.tagName === "INPUT";
  const press = (event) => {
    if (!disabled) onClick?.(event);
    else event.preventDefault();
  };
  const start = (event) => {
    if (!disabled && !disableRipple && !disableTouchRipple)
      ripple.current?.start(event, { center: centerRipple });
  };
  const stop = (event) => ripple.current?.stop(event);
  return h(
    BaseRoot,
    {
      ...rest,
      as: Tag,
      ref,
      type: Tag === "button" ? type || "button" : type,
      ...(Tag === "button"
        ? { disabled }
        : {
            role: rest.href || rest.to ? undefined : "button",
            "aria-disabled": disabled || undefined,
          }),
      ...(rest.role !== undefined ? { role: rest.role } : {}),
      tabIndex: disabled ? -1 : tabIndex,
      className: join(
        classesFor(
          "MuiButtonBase",
          ["root", disabled && "disabled", focusVisible && "focusVisible"],
          classes,
        ),
        focusVisible && focusVisibleClassName,
        className,
      ),
      onClick: press,
      onFocus(event) {
        const visible = event.target.matches?.(":focus-visible");
        if (visible) {
          setFocused(true);
          onFocusVisible?.(event);
        }
        onFocus?.(event);
      },
      onBlur(event) {
        setFocused(false);
        stop(event);
        onBlur?.(event);
      },
      onKeyDown(event) {
        onKeyDown?.(event);
        if (
          disabled ||
          event.defaultPrevented ||
          event.target !== event.currentTarget
        )
          return;
        if (!native(event.currentTarget) && event.key === " ") {
          event.preventDefault();
          start(event);
        }
        if (!native(event.currentTarget) && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.click();
        }
      },
      onKeyUp(event) {
        onKeyUp?.(event);
        stop(event);
        if (
          !disabled &&
          !event.defaultPrevented &&
          event.target === event.currentTarget &&
          !native(event.currentTarget) &&
          event.key === " "
        )
          event.currentTarget.click();
      },
      onMouseDown(event) {
        onMouseDown?.(event);
        start(event);
      },
      onMouseUp(event) {
        onMouseUp?.(event);
        stop(event);
      },
      onMouseLeave(event) {
        onMouseLeave?.(event);
        stop(event);
      },
      onContextMenu(event) {
        onContextMenu?.(event);
        stop(event);
      },
      onTouchStart(event) {
        onTouchStart?.(event);
        start(event);
      },
      onTouchEnd(event) {
        onTouchEnd?.(event);
        stop(event);
      },
      onTouchMove(event) {
        onTouchMove?.(event);
        stop(event);
      },
    },
    children,
    !disableRipple && !disabled && h(Ripple, { ref: rippleRef }),
  );
});
const ButtonGroupContext = React.createContext(empty),
  ToggleContext = React.createContext(null);
function slots(p) {
  return [
    "root",
    p.variant,
    p.color && "color" + upper(p.color),
    p.variant && p.color && p.variant + upper(p.color),
    p.size && "size" + upper(p.size),
    p.variant && p.size && p.variant + "Size" + upper(p.size),
    p.fullWidth && "fullWidth",
    p.disableElevation && "disableElevation",
  ];
}
const overrides = (p, s) => slots(p.ownerState).map((key) => s[key]);
const ButtonRoot = styled(ButtonBase, {
  name: "MuiButton",
  slot: "Root",
  overridesResolver: overrides,
})(({ theme, ownerState: p }) => {
  const c = color(theme, p.color),
    a = palette(theme).action || fallbackPalette.action,
    small = p.size === "small",
    large = p.size === "large";
  const main =
    p.color === "inherit" ? "currentColor" : c?.main || "currentColor";
  const style = {
    ...theme.typography?.button,
    fontFamily:
      theme.typography?.fontFamily || "Roboto, Helvetica, Arial, sans-serif",
    fontWeight: 500,
    fontSize: small ? "0.8125rem" : large ? "0.9375rem" : "0.875rem",
    lineHeight: 1.75,
    textTransform: "uppercase",
    minWidth: 64,
    padding: small ? "4px 5px" : large ? "8px 11px" : "6px 8px",
    borderRadius: theme.shape?.borderRadius ?? 4,
    color: ["text", "outlined", "contained"].includes(p.variant)
      ? main
      : "inherit",
    transition:
      "background-color 250ms, box-shadow 250ms, border-color 250ms, color 250ms",
    width: p.fullWidth ? "100%" : undefined,
    "&:hover": { backgroundColor: tint(main, a.hoverOpacity ?? 0.04) },
    "&.Mui-disabled": { color: a.disabled || fallbackPalette.action.disabled },
    "&.Mui-focusVisible": {
      outline: "2px solid currentColor",
      outlineOffset: 2,
    },
  };
  if (p.variant === "outlined")
    Object.assign(style, {
      border: "1px solid " + tint(main, 0.5),
      padding: small ? "3px 9px" : large ? "7px 21px" : "5px 15px",
      "&:hover": {
        backgroundColor: tint(main, a.hoverOpacity ?? 0.04),
        borderColor: main,
      },
      "&.Mui-disabled": {
        color: a.disabled,
        borderColor: a.disabledBackground,
      },
    });
  if (p.variant === "contained")
    Object.assign(style, {
      color:
        c?.contrastText ||
        palette(theme).text?.primary ||
        fallbackPalette.text.primary,
      backgroundColor:
        p.color === "inherit" ? palette(theme).grey?.[300] || "#e0e0e0" : main,
      padding: small ? "4px 10px" : large ? "8px 22px" : "6px 16px",
      boxShadow: p.disableElevation ? "none" : theme.shadows?.[2],
      "&:hover": {
        backgroundColor: c?.dark || main,
        boxShadow: p.disableElevation ? "none" : theme.shadows?.[4],
      },
      "&:active": {
        boxShadow: p.disableElevation ? "none" : theme.shadows?.[8],
      },
      "&.Mui-disabled": {
        color: a.disabled,
        backgroundColor: a.disabledBackground,
        boxShadow: "none",
      },
    });
  if (p.loading && p.loadingPosition === "center") style.color = "transparent";
  return style;
});
const IconSlot = styled("span", {
  name: "MuiButton",
  slot: "StartIcon",
  overridesResolver: (p, s) => [
    s[p.ownerState.slot],
    s["iconSize" + upper(p.ownerState.size)],
  ],
})(({ ownerState: p }) => ({
  display: "inherit",
  marginLeft: p.slot === "startIcon" ? -4 : 8,
  marginRight: p.slot === "startIcon" ? 8 : -4,
  "& > *:nth-of-type(1)": {
    fontSize: p.size === "small" ? 18 : p.size === "large" ? 22 : 20,
  },
}));
function indicator(p, id) {
  return (
    p.loadingIndicator ??
    h("span", {
      role: "progressbar",
      "aria-labelledby": p["aria-label"] ? undefined : id,
      "aria-label": p["aria-label"] || undefined,
      style: {
        display: "inline-block",
        width: 16,
        height: 16,
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
      },
    })
  );
}
function Loading({ p, id }) {
  return h(
    "span",
    { className: "MuiButton-loadingWrapper", style: { display: "contents" } },
    p.loading &&
      h(
        "span",
        {
          className: "MuiButton-loadingIndicator",
          "data-loading-position": p.loadingPosition,
          style: {
            display: "flex",
            position: "absolute",
            left: p.loadingPosition === "start" ? 12 : undefined,
            right: p.loadingPosition === "end" ? 12 : undefined,
            color: "inherit",
          },
        },
        indicator(p, id),
      ),
  );
}
const Button = React.forwardRef(function Button(input, ref) {
  const group = React.useContext(ButtonGroupContext),
    merged = { ...group };
  for (const [key, value] of Object.entries(input))
    if (value !== undefined) merged[key] = value;
  const p = {
    variant: "text",
    color: "primary",
    size: "medium",
    ...defaults(merged, "MuiButton"),
  };
  const {
    children,
    classes = empty,
    className,
    startIcon,
    endIcon,
    variant,
    color,
    size,
    fullWidth,
    disableElevation,
    loading = null,
    loadingPosition = "center",
    loadingIndicator,
    ...rest
  } = p;
  const rid = React.useId(),
    id = p.id || (loading !== null ? rid : undefined);
  const state = { ...p, loading, loadingPosition };
  const icons = (value, slot) =>
    value != null &&
    h(
      IconSlot,
      {
        className: classesFor(
          "MuiButton",
          [slot, "iconSize" + upper(size)],
          classes,
        ),
        ownerState: { slot, size },
        style:
          loading &&
          loadingPosition === (slot === "startIcon" ? "start" : "end")
            ? { visibility: "hidden" }
            : undefined,
      },
      value,
    );
  return h(
    ButtonRoot,
    {
      ...rest,
      ref,
      id,
      disabled: Boolean(rest.disabled || loading),
      focusRipple: true,
      ownerState: state,
      className: join(
        classesFor(
          "MuiButton",
          [...slots(state), loading && "loading"],
          classes,
        ),
        className,
      ),
    },
    icons(startIcon, "startIcon"),
    loading !== null && h(Loading, { p: state, id }),
    children,
    icons(endIcon, "endIcon"),
  );
});
const IconRoot = styled(ButtonBase, {
  name: "MuiIconButton",
  slot: "Root",
  overridesResolver: overrides,
})(({ theme, ownerState: p }) => {
  const c = color(theme, p.color),
    a = palette(theme).action || fallbackPalette.action,
    main = p.color === "inherit" ? "inherit" : c?.main || a.active;
  return {
    borderRadius: "50%",
    flex: "0 0 auto",
    padding: p.size === "small" ? 5 : p.size === "large" ? 12 : 8,
    fontSize: p.size === "small" ? 18 : p.size === "large" ? 28 : 24,
    textAlign: "center",
    color: main,
    transition: "background-color 150ms",
    marginLeft:
      p.edge === "start" ? (p.size === "small" ? -3 : -12) : undefined,
    marginRight: p.edge === "end" ? (p.size === "small" ? -3 : -12) : undefined,
    "&:hover": {
      backgroundColor: p.disableRipple
        ? "transparent"
        : tint(
            main === "inherit" ? "currentColor" : main,
            a.hoverOpacity ?? 0.04,
          ),
    },
    "&.Mui-disabled": { backgroundColor: "transparent", color: a.disabled },
    "&.Mui-focusVisible": {
      outline: "2px solid currentColor",
      outlineOffset: 2,
    },
  };
});
const IconButton = React.forwardRef(function IconButton(input, ref) {
  const p = {
    color: "default",
    size: "medium",
    ...defaults(input, "MuiIconButton"),
  };
  const {
    children,
    className,
    classes = empty,
    color,
    size,
    edge,
    loading = null,
    loadingIndicator,
    ...rest
  } = p;
  const rid = React.useId(),
    id = p.id || (loading !== null ? rid : undefined);
  return h(
    IconRoot,
    {
      ...rest,
      ref,
      id,
      centerRipple: true,
      focusRipple: !p.disableFocusRipple,
      ownerState: p,
      disabled: Boolean(p.disabled || loading),
      className: join(
        classesFor(
          "MuiIconButton",
          [...slots(p), edge && "edge" + upper(edge), loading && "loading"],
          classes,
        ),
        className,
      ),
    },
    loading !== null &&
      h(
        "span",
        {
          className: "MuiIconButton-loadingWrapper",
          style: { display: "contents" },
        },
        loading &&
          h(
            "span",
            {
              className: "MuiIconButton-loadingIndicator",
              style: { position: "absolute", display: "flex" },
            },
            indicator(p, id),
          ),
      ),
    loading === null
      ? children
      : h(
          "span",
          {
            style: loading
              ? { visibility: "hidden", display: "contents" }
              : { display: "contents" },
          },
          children,
        ),
  );
});
const FabRoot = styled(ButtonBase, {
  name: "MuiFab",
  slot: "Root",
  overridesResolver: overrides,
})(({ theme, ownerState: p }) => {
  const c = color(theme, p.color),
    a = palette(theme).action || fallbackPalette.action,
    n = p.size === "small" ? 40 : p.size === "medium" ? 48 : 56;
  return {
    ...theme.typography?.button,
    minHeight: 36,
    minWidth: 0,
    width: p.variant === "extended" ? "auto" : n,
    height:
      p.variant === "extended"
        ? p.size === "small"
          ? 34
          : p.size === "medium"
            ? 40
            : 48
        : n,
    padding: p.variant === "extended" ? "0 16px" : 0,
    borderRadius: p.variant === "extended" ? n / 2 : "50%",
    fontSize: "0.875rem",
    textTransform: "uppercase",
    backgroundColor: c?.main || palette(theme).grey?.[300] || "#e0e0e0",
    color:
      c?.contrastText ||
      (theme.vars
        ? palette(theme).Fab?.defaultColor ||
          palette(theme).grey?.[900] ||
          "#212121"
        : "rgba(0,0,0,.87)"),
    boxShadow: theme.shadows?.[6],
    "&:hover": { backgroundColor: c?.dark || "#d5d5d5" },
    "&.Mui-disabled": {
      color: a.disabled,
      backgroundColor: a.disabledBackground,
      boxShadow: "none",
    },
    "&.Mui-focusVisible": {
      outline: "2px solid currentColor",
      outlineOffset: 2,
    },
  };
});
const Fab = React.forwardRef(function Fab(input, ref) {
  const p = {
    color: "default",
    size: "large",
    variant: "circular",
    ...defaults(input, "MuiFab"),
  };
  const {
    children,
    classes = empty,
    className,
    color,
    size,
    variant,
    ...rest
  } = p;
  return h(
    FabRoot,
    {
      ...rest,
      ref,
      focusRipple: !p.disableFocusRipple,
      ownerState: p,
      className: join(
        classesFor(
          "MuiFab",
          [...slots(p), color !== "default" && color !== "inherit" && color],
          classes,
        ),
        className,
      ),
    },
    children,
  );
});
const GroupRoot = styled("div", {
  name: "MuiButtonGroup",
  slot: "Root",
  overridesResolver: (p, s) => [
    s.root,
    s[p.ownerState.variant],
    s[p.ownerState.orientation],
    p.ownerState.fullWidth && s.fullWidth,
    p.ownerState.disableElevation && s.disableElevation,
  ],
})(({ theme, ownerState: p }) => ({
  display: "inline-flex",
  borderRadius: theme.shape?.borderRadius ?? 4,
  flexDirection: p.orientation === "vertical" ? "column" : "row",
  width: p.fullWidth ? "100%" : undefined,
  "& > .MuiButtonGroup-grouped": { minWidth: 40, boxShadow: "none" },
  ...(p.orientation === "vertical"
    ? {
        "& > .MuiButtonGroup-firstButton, & > .MuiButtonGroup-middleButton": {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        },
        "& > .MuiButtonGroup-lastButton, & > .MuiButtonGroup-middleButton": {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
      }
    : {
        "& > .MuiButtonGroup-firstButton, & > .MuiButtonGroup-middleButton": {
          borderStartEndRadius: 0,
          borderEndEndRadius: 0,
        },
        "& > .MuiButtonGroup-lastButton, & > .MuiButtonGroup-middleButton": {
          borderStartStartRadius: 0,
          borderEndStartRadius: 0,
        },
      }),
}));
const ButtonGroup = React.forwardRef(function ButtonGroup(input, ref) {
  const p = {
    color: "primary",
    variant: "outlined",
    size: "medium",
    orientation: "horizontal",
    ...defaults(input, "MuiButtonGroup"),
  };
  const {
    children,
    component = "div",
    classes = empty,
    className,
    color,
    variant,
    size,
    orientation,
    disabled,
    disableElevation,
    disableRipple,
    fullWidth,
    ...rest
  } = p;
  const shared = React.useMemo(
    () => ({
      color,
      variant,
      size,
      disabled,
      disableElevation,
      disableRipple,
      fullWidth,
    }),
    [
      color,
      variant,
      size,
      disabled,
      disableElevation,
      disableRipple,
      fullWidth,
    ],
  );
  const list = React.Children.toArray(children).filter(React.isValidElement);
  return h(
    GroupRoot,
    {
      ...rest,
      ref,
      as: component,
      role: rest.role || "group",
      ownerState: p,
      className: join(
        classesFor(
          "MuiButtonGroup",
          [
            "root",
            variant,
            orientation,
            fullWidth && "fullWidth",
            disableElevation && "disableElevation",
          ],
          classes,
        ),
        className,
      ),
    },
    h(
      ButtonGroupContext.Provider,
      { value: shared },
      list.map((child, i) =>
        React.cloneElement(child, {
          className: join(
            classesFor(
              "MuiButtonGroup",
              [
                "grouped",
                "grouped" + upper(orientation),
                "grouped" + upper(variant),
                "grouped" + upper(variant) + upper(orientation),
                "grouped" + upper(variant) + upper(color),
                list.length > 1 &&
                  (i === 0
                    ? "firstButton"
                    : i === list.length - 1
                      ? "lastButton"
                      : "middleButton"),
              ],
              classes,
            ),
            child.props.className,
          ),
        }),
      ),
    ),
  );
});
const ToggleRoot = styled(ButtonBase, {
  name: "MuiToggleButton",
  slot: "Root",
  overridesResolver: overrides,
})(({ theme, ownerState: p }) => {
  const a = palette(theme).action || fallbackPalette.action,
    main =
      color(theme, p.color)?.main ||
      palette(theme).text?.primary ||
      fallbackPalette.text.primary;
  return {
    ...theme.typography?.button,
    border: "1px solid " + (palette(theme).divider || "rgba(0,0,0,.12)"),
    borderRadius: theme.shape?.borderRadius ?? 4,
    padding: p.size === "small" ? 7 : p.size === "large" ? 15 : 11,
    fontSize:
      p.size === "small"
        ? "0.8125rem"
        : p.size === "large"
          ? "0.9375rem"
          : "0.875rem",
    textTransform: "uppercase",
    color: a.active,
    "&:hover": { backgroundColor: tint(main, a.hoverOpacity ?? 0.04) },
    "&.Mui-selected": {
      color: main,
      backgroundColor: tint(main, a.selectedOpacity ?? 0.08),
      "&:hover": {
        backgroundColor: tint(
          main,
          typeof a.selectedOpacity === "string" ||
            typeof a.hoverOpacity === "string"
            ? `calc(${a.selectedOpacity ?? 0.08} + ${a.hoverOpacity ?? 0.04})`
            : (a.selectedOpacity ?? 0.08) + (a.hoverOpacity ?? 0.04),
        ),
      },
    },
    "&.Mui-disabled": { color: a.disabled, borderColor: a.disabledBackground },
    "&.Mui-focusVisible": {
      outline: "2px solid currentColor",
      outlineOffset: 2,
    },
  };
});
const ToggleButton = React.forwardRef(function ToggleButton(input, ref) {
  const group = React.useContext(ToggleContext),
    p = {
      color: "standard",
      size: "medium",
      ...defaults({ ...group?.options, ...input }, "MuiToggleButton"),
    };
  const {
    children,
    value,
    onChange,
    onClick,
    fullWidth,
    selected: explicit,
    classes = empty,
    className,
    color,
    size,
    ...rest
  } = p;
  const selected =
    explicit ??
    (group
      ? group.exclusive
        ? group.value === value
        : Array.isArray(group.value) && group.value.includes(value)
      : false);
  const state = { ...p, selected };
  return h(
    ToggleRoot,
    {
      ...rest,
      ref,
      value,
      "aria-pressed": selected,
      ownerState: state,
      className: join(
        classesFor(
          "MuiToggleButton",
          [...slots(state), selected && "selected"],
          classes,
        ),
        className,
      ),
      onClick(event) {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onChange?.(event, value);
          group?.change(event, value);
        }
      },
    },
    children,
  );
});
const ToggleGroupRoot = styled("div", {
  name: "MuiToggleButtonGroup",
  slot: "Root",
  overridesResolver: (p, s) => [
    s.root,
    s[p.ownerState.orientation],
    p.ownerState.fullWidth && s.fullWidth,
  ],
})(({ theme, ownerState: p }) => ({
  display: "inline-flex",
  borderRadius: theme.shape?.borderRadius ?? 4,
  flexDirection: p.orientation === "vertical" ? "column" : "row",
  width: p.fullWidth ? "100%" : undefined,
  "& > .MuiToggleButtonGroup-grouped": {
    margin: 0,
    flex: p.fullWidth ? 1 : undefined,
  },
  ...(p.orientation === "vertical"
    ? {
        "& > .MuiToggleButtonGroup-firstButton, & > .MuiToggleButtonGroup-middleButton":
          { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
        "& > .MuiToggleButtonGroup-lastButton, & > .MuiToggleButtonGroup-middleButton":
          { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -1 },
      }
    : {
        "& > .MuiToggleButtonGroup-firstButton, & > .MuiToggleButtonGroup-middleButton":
          { borderStartEndRadius: 0, borderEndEndRadius: 0 },
        "& > .MuiToggleButtonGroup-lastButton, & > .MuiToggleButtonGroup-middleButton":
          {
            borderStartStartRadius: 0,
            borderEndStartRadius: 0,
            marginInlineStart: -1,
          },
      }),
}));
const ToggleButtonGroup = React.forwardRef(
  function ToggleButtonGroup(input, ref) {
    const p = {
      color: "standard",
      size: "medium",
      orientation: "horizontal",
      exclusive: false,
      ...defaults(input, "MuiToggleButtonGroup"),
    };
    const {
      children,
      value,
      onChange,
      exclusive,
      color,
      size,
      orientation,
      disabled,
      fullWidth,
      component = "div",
      classes = empty,
      className,
      ...rest
    } = p;
    const change = React.useCallback(
      (event, child) => {
        onChange?.(
          event,
          exclusive
            ? value === child
              ? null
              : child
            : Array.isArray(value) && value.includes(child)
              ? value.filter((v) => v !== child)
              : [...(value || []), child],
        );
      },
      [onChange, value, exclusive],
    );
    const ctx = React.useMemo(
      () => ({
        value,
        exclusive,
        change,
        options: { color, size, disabled, fullWidth },
      }),
      [value, exclusive, change, color, size, disabled, fullWidth],
    );
    const list = React.Children.toArray(children).filter(React.isValidElement);
    return h(
      ToggleGroupRoot,
      {
        ...rest,
        as: component,
        ref,
        role: rest.role || "group",
        ownerState: p,
        className: join(
          classesFor(
            "MuiToggleButtonGroup",
            [
              "root",
              orientation,
              "size" + upper(size),
              fullWidth && "fullWidth",
            ],
            classes,
          ),
          className,
        ),
      },
      h(
        ToggleContext.Provider,
        { value: ctx },
        list.map((child, i) =>
          React.cloneElement(child, {
            className: join(
              classesFor(
                "MuiToggleButtonGroup",
                [
                  "grouped",
                  "grouped" + upper(orientation),
                  list.length > 1 &&
                    (i === 0
                      ? "firstButton"
                      : i === list.length - 1
                        ? "lastButton"
                        : "middleButton"),
                ],
                classes,
              ),
              child.props.className,
            ),
          }),
        ),
      ),
    );
  },
);
const api = {
  ButtonBase,
  Button,
  IconButton,
  Fab,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
};
for (const [name, component] of Object.entries(api))
  component.displayName = name;
for (const name of Object.keys(api)) {
  const component = "Mui" + name,
    lower = name[0].toLowerCase() + name.slice(1);
  api["get" + name + "UtilityClass"] = (slot) => utility(component, slot);
  const slots = [
    "root",
    "disabled",
    "focusVisible",
    "selected",
    "fullWidth",
    "disableElevation",
    "loading",
    "loadingWrapper",
    "loadingIndicator",
    "startIcon",
    "endIcon",
    "horizontal",
    "vertical",
    "grouped",
    "firstButton",
    "middleButton",
    "lastButton",
    "edgeStart",
    "edgeEnd",
    "circular",
    "extended",
  ];
  for (const size of ["Small", "Medium", "Large"])
    slots.push("size" + size, "iconSize" + size);
  for (const variant of ["text", "outlined", "contained"]) {
    slots.push(variant);
    for (const c of [
      "Primary",
      "Secondary",
      "Error",
      "Info",
      "Success",
      "Warning",
      "Inherit",
    ])
      slots.push(variant + c);
    for (const size of ["Small", "Medium", "Large"])
      slots.push(variant + "Size" + size);
  }
  for (const c of [
    "Primary",
    "Secondary",
    "Error",
    "Info",
    "Success",
    "Warning",
    "Inherit",
    "Standard",
  ])
    slots.push("color" + c);
  api[lower + "Classes"] = Object.freeze(
    Object.fromEntries(slots.map((slot) => [slot, utility(component, slot)])),
  );
}
module.exports = api;
