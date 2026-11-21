"use strict";
const React = require("react");
const { styled, useThemeProps } = require("./theme.cjs");
const { SvgIcon } = require("./text.cjs");
const { visuallyHidden } = require("vmui-utils");
const h = React.createElement;
const slots = [
  "root",
  "sizeSmall",
  "sizeMedium",
  "sizeLarge",
  "readOnly",
  "disabled",
  "focusVisible",
  "visuallyHidden",
  "pristine",
  "label",
  "labelEmptyValueActive",
  "icon",
  "iconEmpty",
  "iconFilled",
  "iconHover",
  "iconFocus",
  "iconActive",
  "decimal",
];
const getRatingUtilityClass = (slot) =>
  (["readOnly", "disabled", "focusVisible"].includes(slot)
    ? "Mui-"
    : "MuiRating-") + slot;
const ratingClasses = Object.freeze(
  Object.fromEntries(slots.map((slot) => [slot, getRatingUtilityClass(slot)])),
);
const defaultLabel = (v) => (v === 1 ? "1 Star" : (v || 0) + " Stars");
const sizes = { small: 18, medium: 24, large: 30 };
const sizeKey = (size) => "size" + size[0].toUpperCase() + size.slice(1);
const Root = styled("span", {
  name: "MuiRating",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, styles) => [
    styles.root,
    styles[sizeKey(s.size)],
    s.readOnly && styles.readOnly,
  ],
})(({ theme, ownerState: s }) => ({
  display: "inline-flex",
  position: "relative",
  width: "min-content",
  textAlign: "left",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  color: (theme.vars || theme).palette.Rating?.active || "#faaf00",
  fontSize:
    theme.typography.pxToRem?.(sizes[s.size]) || sizes[s.size] / 16 + "rem",
  "&.Mui-disabled": {
    opacity: theme.palette.action?.disabledOpacity ?? 0.38,
    pointerEvents: "none",
  },
  "&.Mui-readOnly": { pointerEvents: "none" },
  "&.Mui-focusVisible .MuiRating-iconActive": { outline: "1px solid #999" },
  "& .MuiRating-visuallyHidden": visuallyHidden,
  "& .MuiRating-pristine": {
    position: "absolute",
    width: "1px",
    bottom: 0,
    left: 0,
  },
  "& label": { cursor: "inherit" },
}));
const Icon = styled("span", {
  name: "MuiRating",
  slot: "Icon",
  overridesResolver: ({ ownerState: s }, o) => [
    o.icon,
    s.filled ? o.iconFilled : o.iconEmpty,
    s.active && o.iconActive,
  ],
})(({ theme, ownerState: s }) => ({
  display: "flex",
  pointerEvents: "none",
  transition:
    theme.transitions?.create?.("transform", { duration: 150 }) ||
    "transform 150ms ease",
  color: s.filled ? undefined : (theme.vars || theme).palette.action.disabled,
  transform: s.active ? "scale(1.2)" : undefined,
}));
// The two stars use the same outline so choosing a value cannot shift the row.
const starPath =
  "M12 2.4 14.9 8.6 21.8 9.5 16.7 14.4 18 21.2 12 18 6 21.2 7.3 14.4 2.2 9.5 9.1 8.6Z";
function star(filled) {
  return h(
    SvgIcon,
    {
      fontSize: "inherit",
      "data-testid": filled ? "StarIcon" : "StarBorderIcon",
    },
    h("path", {
      d: starPath,
      ...(!filled && {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinejoin: "round",
      }),
    }),
  );
}
const filledStar = star(true),
  emptyStar = star(false);
const Rating = React.forwardRef(function Rating(input, ref) {
  const p = useThemeProps({ props: input, name: "MuiRating" });
  const {
    name: explicitName,
    value: controlled,
    defaultValue = null,
    onChange,
    onChangeActive,
    max = 5,
    precision = 1,
    size = "medium",
    disabled = false,
    readOnly = false,
    getLabelText = defaultLabel,
    emptyLabelText = "Empty",
    icon = filledStar,
    emptyIcon = emptyStar,
    highlightSelectedOnly = false,
    component = "span",
    classes = {},
    className,
    onMouseMove,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  } = p;
  if (precision !== 1)
    throw new RangeError("Rating supports whole-star preferences");
  if (!Number.isSafeInteger(max) || max < 1)
    throw new RangeError("Rating max must be a positive integer");
  const id = React.useId(),
    name = explicitName ?? id;
  const [local, setLocal] = React.useState(defaultValue),
    [hover, setHover] = React.useState(-1),
    [focus, setFocus] = React.useState(-1);
  const value = controlled === undefined ? local : controlled;
  const active = disabled || readOnly ? -1 : hover >= 0 ? hover : focus;
  const painted = active >= 0 ? active : value;
  const css = (...keys) =>
    keys
      .filter(Boolean)
      .flatMap((key) => [ratingClasses[key], classes[key]])
      .filter(Boolean)
      .join(" ");
  function select(e, next) {
    if (disabled || readOnly) return;
    if (controlled === undefined) setLocal(next);
    onChange?.(e, next);
  }
  function preview(e, next) {
    if (next !== hover) {
      setHover(next);
      onChangeActive?.(e, next);
    }
  }
  const children = [];
  for (let n = 1; n <= max; n++) {
    const inputId = id + "-star-" + n,
      filled = highlightSelectedOnly ? n === painted : n <= painted;
    const visual = h(
      Icon,
      {
        className: css(
          "icon",
          filled ? "iconFilled" : "iconEmpty",
          hover >= n && "iconHover",
          focus >= n && "iconFocus",
          active === n && "iconActive",
        ),
        ownerState: { filled, active: active === n },
      },
      filled ? icon : (emptyIcon ?? icon),
    );
    if (readOnly) {
      children.push(h("span", { key: n }, visual));
      continue;
    }
    children.push(
      h(
        "label",
        { key: "l" + n, htmlFor: inputId },
        visual,
        h("span", { className: css("visuallyHidden") }, getLabelText(n)),
      ),
      h("input", {
        key: n,
        type: "radio",
        id: inputId,
        name,
        value: n,
        disabled,
        checked: n === value,
        className: css("visuallyHidden"),
        onClick: (e) => {
          if (value === n) {
            setHover(-1);
            setFocus(-1);
            select(e, null);
          }
        },
        onChange: (e) => select(e, n),
      }),
    );
  }
  if (!readOnly && !disabled)
    children.push(
      h(
        "label",
        {
          key: "empty",
          className: css(
            "label",
            "pristine",
            focus === 0 && "labelEmptyValueActive",
          ),
        },
        h("input", {
          type: "radio",
          id: id + "-empty",
          name,
          value: "",
          checked: value === null,
          className: css("visuallyHidden"),
          onChange: (e) => select(e, null),
        }),
        h("span", { className: css("visuallyHidden") }, emptyLabelText),
      ),
    );
  return h(
    Root,
    {
      ...(readOnly && { role: "img", "aria-label": getLabelText(value ?? 0) }),
      ...rest,
      ref,
      as: component,
      ownerState: { ...p, size, readOnly, disabled },
      className: [
        css(
          "root",
          sizeKey(size),
          disabled && "disabled",
          readOnly && "readOnly",
          focus >= 0 && "focusVisible",
        ),
        className,
      ]
        .filter(Boolean)
        .join(" "),
      onFocus: (e) => {
        if (
          !disabled &&
          !readOnly &&
          e.target.type === "radio" &&
          e.target.matches(":focus-visible")
        )
          setFocus(Number(e.target.value));
        onFocus?.(e);
      },
      onBlur: (e) => {
        setFocus(-1);
        onBlur?.(e);
      },
      onMouseMove: (e) => {
        if (!disabled && !readOnly) {
          const el = e.currentTarget,
            rect = el.getBoundingClientRect();
          if (rect.width) {
            const rtl =
              el.ownerDocument.defaultView.getComputedStyle(el).direction ===
              "rtl";
            const offset = rtl ? rect.right - e.clientX : e.clientX - rect.left;
            preview(
              e,
              Math.max(
                1,
                Math.min(max, Math.ceil((offset * max) / rect.width)),
              ),
            );
          }
        }
        onMouseMove?.(e);
      },
      onMouseLeave: (e) => {
        if (!disabled && !readOnly) preview(e, -1);
        onMouseLeave?.(e);
      },
    },
    children,
  );
});
module.exports = { Rating, getRatingUtilityClass, ratingClasses };
