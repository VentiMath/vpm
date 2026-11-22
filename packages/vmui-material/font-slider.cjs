"use strict";
const React = require("react");
const { styled, useTheme, useThemeProps } = require("./theme.cjs");
const slots = [
  "root",
  "active",
  "colorPrimary",
  "colorSecondary",
  "colorError",
  "colorInfo",
  "colorSuccess",
  "colorWarning",
  "disabled",
  "dragging",
  "focusVisible",
  "mark",
  "markActive",
  "marked",
  "markLabel",
  "markLabelActive",
  "rail",
  "sizeSmall",
  "thumb",
  "track",
  "trackInverted",
  "trackFalse",
  "valueLabel",
  "valueLabelOpen",
  "valueLabelCircle",
  "valueLabelLabel",
  "vertical",
];
const shared = new Set(["active", "disabled", "focusVisible"]);
const getSliderUtilityClass = (slot) =>
  (shared.has(slot) ? "Mui-" : "MuiSlider-") + slot;
const sliderClasses = Object.freeze(
  Object.fromEntries(slots.map((slot) => [slot, getSliderUtilityClass(slot)])),
);
const capital = (value) => value[0].toUpperCase() + value.slice(1);
const pct = (v, min, max) => (100 * (v - min)) / (max - min) + "%";
const Root = styled("span", {
  name: "MuiSlider",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, o) => [
    o.root,
    o["color" + capital(s.color)],
    o["size" + capital(s.size)],
    s.marked && o.marked,
    s.track === false && o.trackFalse,
  ],
})(({ theme, ownerState: s }) => ({
  position: "relative",
  display: "inline-block",
  boxSizing: "content-box",
  width: "100%",
  height: s.size === "small" ? 2 : 4,
  padding: "13px 0",
  borderRadius: 12,
  color: (theme.vars || theme).palette[s.color]?.main,
  cursor: "pointer",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
  marginBottom: s.marked ? 20 : undefined,
  "&.Mui-disabled": {
    pointerEvents: "none",
    color: (theme.vars || theme).palette.grey?.[400],
  },
  "& .MuiSlider-rail, & .MuiSlider-track, & .MuiSlider-mark, & .MuiSlider-thumb":
    { position: "absolute", top: "50%" },
  "& .MuiSlider-rail, & .MuiSlider-track": {
    transform: "translateY(-50%)",
    height: "inherit",
    borderRadius: "inherit",
    background: "currentColor",
  },
  "& .MuiSlider-rail": { width: "100%", opacity: 0.38, left: 0 },
  "& .MuiSlider-track": { display: s.track === false ? "none" : undefined },
  "& .MuiSlider-mark": {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "currentColor",
    transform: "translate(-50%,-50%)",
  },
  "& .MuiSlider-markActive": {
    backgroundColor:
      s.track === false
        ? "currentColor"
        : (theme.vars || theme).palette.background?.paper,
  },
  "& .MuiSlider-markLabel": {
    ...theme.typography.body2,
    position: "absolute",
    top: 30,
    whiteSpace: "nowrap",
    transform: s.rtl ? "translateX(50%)" : "translateX(-50%)",
    color: (theme.vars || theme).palette.text.secondary,
  },
  "& .MuiSlider-markLabelActive": {
    color: (theme.vars || theme).palette.text.primary,
  },
  "& .MuiSlider-thumb:has(input:focus-visible)": {
    outline: "2px solid currentColor",
    outlineOffset: 3,
  },
  "@media (pointer: coarse)": {
    padding: "20px 0",
    "& .MuiSlider-markLabel": { top: 40 },
  },
}));
const Thumb = styled("span", {
  name: "MuiSlider",
  slot: "Thumb",
  overridesResolver: ({ ownerState: s }, o) => [
    o.thumb,
    o["thumbSize" + capital(s.size)],
    o["thumbColor" + capital(s.color)],
  ],
})(({ ownerState: s }) => ({
  width: s.size === "small" ? 12 : 20,
  height: s.size === "small" ? 12 : 20,
  borderRadius: "50%",
  backgroundColor: "currentColor",
  transform: s.rtl ? "translate(50%,-50%)" : "translate(-50%,-50%)",
}));
const hidden = {
  position: "absolute",
  width: "100%",
  height: "100%",
  padding: 0,
  margin: -1,
  border: 0,
  clipPath: "inset(50%)",
  overflow: "hidden",
  whiteSpace: "nowrap",
};
const empty = [];
const layout =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
function nearest(value, marks) {
  let best = marks[0].value;
  for (const mark of marks)
    if (Math.abs(mark.value - value) <= Math.abs(best - value))
      best = mark.value;
  return best;
}
const Slider = React.forwardRef(function Slider(input, ref) {
  const p = useThemeProps({ props: input, name: "MuiSlider" });
  const {
    value: controlled,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    shiftStep = 10,
    marks = empty,
    track = "normal",
    size = "medium",
    color = "primary",
    disabled = false,
    valueLabelDisplay = "off",
    orientation = "horizontal",
    name,
    tabIndex,
    classes = {},
    className,
    component = "span",
    onChange,
    onChangeCommitted,
    getAriaValueText,
    "aria-label": label,
    "aria-labelledby": labelledBy,
    "aria-valuetext": valueText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    ...rest
  } = p;
  const rtl = useTheme().direction === "rtl";
  if (
    Array.isArray(controlled ?? defaultValue) ||
    orientation !== "horizontal" ||
    valueLabelDisplay !== "off"
  )
    throw new TypeError(
      "Slider supports horizontal scalar values with valueLabelDisplay off",
    );
  if (
    !Array.isArray(marks) ||
    !(max > min) ||
    !(step === null ? marks.length : step > 0)
  )
    throw new RangeError(
      "Slider requires increasing bounds and a positive step or explicit marks",
    );
  const stops = React.useMemo(
    () =>
      marks
        .filter((m) => m.value >= min && m.value <= max)
        .slice()
        .sort((a, b) => a.value - b.value),
    [marks, min, max],
  );
  if (step === null && !stops.length)
    throw new RangeError("Slider needs a mark within its bounds");
  const [local, setLocal] = React.useState(defaultValue ?? min),
    [dragging, setDragging] = React.useState(false);
  const value = Math.min(max, Math.max(min, controlled ?? local));
  const drag = React.useRef(null),
    inputRef = React.useRef(null);
  const pending = React.useRef([]),
    [revision, advance] = React.useReducer((v) => v + 1, 0);
  // Controlled toolbars often commit from their latest React state. Deliver
  // the completion after React applies the change, including keyboard changes.
  layout(() => {
    for (const entry of pending.current.splice(0))
      onChangeCommitted?.(entry.event, entry.value);
  }, [revision, onChangeCommitted]);
  function commit(event, value) {
    if (onChangeCommitted) {
      pending.current.push({ event: event.nativeEvent ?? event, value });
      advance();
    }
  }
  function change(event, next, previous = value) {
    if (next === previous) return;
    if (controlled === undefined) setLocal(next);
    if (onChange) {
      const native = event.nativeEvent ?? event;
      const copy = new native.constructor(native.type, native);
      Object.defineProperty(copy, "target", {
        value: { name, value: next },
        enumerable: true,
      });
      onChange(copy, next, 0);
    }
  }
  function snap(raw) {
    if (step === null) return nearest(raw, stops);
    const stepped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, Number(stepped.toPrecision(15))));
  }
  function position(event) {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return value;
    const fraction = Math.min(
      1,
      Math.max(0, (event.clientX - box.left) / box.width),
    );
    return snap(min + (rtl ? 1 - fraction : fraction) * (max - min));
  }
  function down(e) {
    onPointerDown?.(e);
    if (
      e.defaultPrevented ||
      disabled ||
      drag.current ||
      e.button !== 0 ||
      e.isPrimary === false
    )
      return;
    e.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = position(e);
    drag.current = { id: e.pointerId, value: next };
    setDragging(true);
    change(e, next);
  }
  function move(e) {
    onPointerMove?.(e);
    const current = drag.current;
    if (!current || e.pointerId !== current.id || disabled) return;
    const next = position(e);
    change(e, next, current.value);
    current.value = next;
  }
  function end(e, cancel) {
    const current = drag.current;
    if (!current || e.pointerId !== current.id) return;
    drag.current = null;
    setDragging(false);
    if (!cancel && !disabled) {
      const next = position(e);
      change(e, next, current.value);
      commit(e, next);
    }
  }
  function key(e) {
    if (disabled) return;
    let direction;
    switch (e.key) {
      case "Home":
      case "End":
        break;
      case "ArrowUp":
      case "PageUp":
        direction = 1;
        break;
      case "ArrowDown":
      case "PageDown":
        direction = -1;
        break;
      case "ArrowRight":
        direction = rtl ? -1 : 1;
        break;
      case "ArrowLeft":
        direction = rtl ? 1 : -1;
        break;
      default:
        return;
    }
    e.preventDefault();
    let next;
    if (e.key === "Home") next = step === null ? stops[0].value : min;
    else if (e.key === "End") next = step === null ? stops.at(-1).value : max;
    else if (step === null)
      next =
        (direction > 0
          ? stops.find((m) => m.value > value)
          : stops.findLast((m) => m.value < value)
        )?.value ?? value;
    else
      next = snap(
        value +
          direction *
            (e.shiftKey || e.key.startsWith("Page") ? shiftStep : step),
      );
    change(e, next);
    commit(e, next);
  }
  const marked = stops.some((m) => m.label != null),
    state = { ...p, track, size, color, marked, disabled, rtl };
  const cx = (...keys) =>
    keys
      .filter(Boolean)
      .flatMap((k) => [getSliderUtilityClass(k), classes[k]])
      .filter(Boolean)
      .join(" ");
  const edge = rtl ? "right" : "left",
    offset = pct(value, min, max);
  const marksDom = stops.map((mark, i) => {
    const active =
      track === false
        ? mark.value === value
        : track === "inverted"
          ? mark.value >= value
          : mark.value <= value;
    const style = { [edge]: pct(mark.value, min, max) };
    return React.createElement(
      React.Fragment,
      { key: i },
      React.createElement("span", {
        className: cx("mark", active && "markActive"),
        "data-index": i,
        style,
      }),
      mark.label != null &&
        React.createElement(
          "span",
          {
            className: cx("markLabel", active && "markLabelActive"),
            "data-index": i,
            "aria-hidden": true,
            style,
          },
          mark.label,
        ),
    );
  });
  return React.createElement(
    Root,
    {
      ...rest,
      as: component,
      ownerState: state,
      ref,
      className: [
        cx(
          "root",
          marked && "marked",
          track === false && "trackFalse",
          track === "inverted" && "trackInverted",
          "color" + capital(color),
          "size" + capital(size),
          disabled && "disabled",
          dragging && "dragging",
        ),
        className,
      ]
        .filter(Boolean)
        .join(" "),
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: (e) => {
        onPointerUp?.(e);
        end(e, false);
      },
      onPointerCancel: (e) => {
        onPointerCancel?.(e);
        end(e, true);
      },
      onLostPointerCapture: (e) => {
        onLostPointerCapture?.(e);
        end(e, true);
      },
    },
    React.createElement("span", { className: cx("rail") }),
    React.createElement("span", {
      className: cx("track"),
      style:
        track === "inverted"
          ? { [edge]: offset, width: pct(max - value, 0, max - min) }
          : { [edge]: "0%", width: offset },
    }),
    marksDom,
    React.createElement(
      Thumb,
      {
        ownerState: state,
        className: cx("thumb", dragging && "active", disabled && "disabled"),
        "data-index": 0,
        style: { [edge]: offset },
      },
      React.createElement("input", {
        ref: inputRef,
        type: "range",
        name,
        tabIndex,
        value,
        min,
        max,
        step: step ?? "any",
        disabled,
        style: { ...hidden, direction: rtl ? "rtl" : "ltr" },
        "data-index": 0,
        "aria-label": label,
        "aria-labelledby": labelledBy,
        "aria-orientation": "horizontal",
        "aria-valuemin": min,
        "aria-valuemax": max,
        "aria-valuenow": value,
        "aria-valuetext": getAriaValueText?.(value, 0) ?? valueText,
        onKeyDown: key,
        onChange: (e) => {
          const raw = e.currentTarget.valueAsNumber;
          if (Number.isFinite(raw) && !disabled) {
            const next = snap(raw);
            change(e, next);
            commit(e, next);
          }
        },
      }),
    ),
  );
});
module.exports = { Slider, sliderClasses, getSliderUtilityClass };
