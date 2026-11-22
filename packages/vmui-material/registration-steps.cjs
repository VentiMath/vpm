"use strict";
const React = require("react");
const { styled, useThemeProps } = require("./theme.cjs");
const { SvgIcon } = require("./text.cjs");
const {
  unstable_generateUtilityClass: utility,
  unstable_generateUtilityClasses: utilities,
} = require("vmui-utils");
const h = React.createElement;
const stepperKeys = [
  "root",
  "horizontal",
  "vertical",
  "alternativeLabel",
  "nonLinear",
];
const stepKeys = [
  "root",
  "horizontal",
  "vertical",
  "alternativeLabel",
  "completed",
];
const labelKeys = [
  "root",
  "horizontal",
  "vertical",
  "label",
  "active",
  "completed",
  "error",
  "disabled",
  "iconContainer",
  "alternativeLabel",
  "labelContainer",
];
const stepperClasses = utilities("MuiStepper", stepperKeys),
  stepClasses = utilities("MuiStep", stepKeys),
  stepLabelClasses = utilities("MuiStepLabel", labelKeys);
function names(classes, custom, ...keys) {
  return keys
    .filter(Boolean)
    .map((key) => [classes[key], custom?.[key]].filter(Boolean).join(" "))
    .join(" ");
}
const Flow = React.createContext({ orientation: "horizontal", activeStep: 0 });
const Position = React.createContext({});
const StepperRoot = styled("ol", {
  name: "MuiStepper",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, o) => [
    o.root,
    o[s.orientation],
    s.alternativeLabel && o.alternativeLabel,
    s.nonLinear && o.nonLinear,
  ],
})(({ ownerState: s }) => ({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: s.orientation === "vertical" ? "column" : "row",
  alignItems:
    s.orientation === "vertical"
      ? "stretch"
      : s.alternativeLabel
        ? "flex-start"
        : "center",
}));
const StepRoot = styled("li", {
  name: "MuiStep",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, o) => [
    o.root,
    o[s.orientation],
    s.alternativeLabel && o.alternativeLabel,
    s.completed && o.completed,
  ],
})(({ ownerState: s }) => ({
  position: "relative",
  paddingInline: s.orientation === "horizontal" ? 8 : undefined,
  flex: s.alternativeLabel ? 1 : undefined,
  display:
    s.orientation === "horizontal" && !s.alternativeLabel ? "flex" : undefined,
  alignItems: "center",
  listStyle: "none",
}));
const Connector = styled("div", { name: "MuiStepConnector", slot: "Root" })(
  ({ theme, ownerState: s }) => ({
    flex: "1 1 auto",
    ...(s.alternativeLabel && s.orientation === "horizontal"
      ? {
          position: "absolute",
          top: 12,
          insetInlineStart: "calc(-50% + 20px)",
          insetInlineEnd: "calc(50% + 20px)",
        }
      : {}),
    ...(s.orientation === "vertical" ? { marginInlineStart: 12 } : {}),
    "& .MuiStepConnector-line": {
      display: "block",
      borderColor:
        theme.vars?.palette?.StepConnector?.border ??
        (theme.palette.mode === "dark"
          ? (theme.palette.grey?.[600] ?? "#757575")
          : (theme.palette.grey?.[400] ?? "#bdbdbd")),
      borderStyle: "solid",
      borderWidth: s.orientation === "vertical" ? "0 0 0 1px" : "1px 0 0",
      minHeight: s.orientation === "vertical" ? 24 : undefined,
    },
  }),
);
const LabelRoot = styled("span", {
  name: "MuiStepLabel",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, o) => [
    o.root,
    o[s.orientation],
    s.alternativeLabel && o.alternativeLabel,
  ],
})(({ theme, ownerState: s }) => {
  const p = (theme.vars || theme).palette;
  return {
    display: "flex",
    alignItems: "center",
    flexDirection: s.alternativeLabel ? "column" : "row",
    paddingBlock: s.orientation === "vertical" ? 8 : undefined,
    "& .MuiStepLabel-iconContainer": {
      display: "flex",
      flexShrink: 0,
      paddingInlineEnd: s.alternativeLabel ? 0 : 8,
    },
    "& .MuiStepLabel-labelContainer": {
      width: "100%",
      textAlign: s.alternativeLabel ? "center" : undefined,
      color: p.text.secondary,
    },
    "& .MuiStepLabel-label": {
      ...theme.typography.body2,
      fontSize: theme.typography.body2?.fontSize ?? "0.875rem",
      display: "block",
      marginTop: s.alternativeLabel ? 16 : undefined,
    },
    "& .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed": {
      fontWeight: theme.typography.fontWeightMedium,
      color: p.text.primary,
    },
    "& .MuiStepLabel-label.Mui-error": { color: p.error.main },
  };
});
const Mark = styled(SvgIcon, { name: "MuiStepIcon", slot: "Root" })(({
  theme,
  ownerState: s,
}) => {
  const p = (theme.vars || theme).palette;
  return {
    color: s.error
      ? p.error.main
      : s.active || s.completed
        ? p.primary.main
        : p.text.disabled,
  };
});
const MarkText = styled("text", {
  name: "MuiStepIcon",
  slot: "Text",
  overridesResolver: (_, o) => o.text,
})(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: "0.75rem",
  fill: (theme.vars || theme).palette.primary.contrastText,
}));
function StepMark({ state, icon, error }) {
  if (typeof icon !== "number" && typeof icon !== "string") return icon ?? null;
  const children = error
    ? h("path", {
        d: "M12 2 1 22h22z M11 8h2v7h-2z M11 17h2v2h-2z",
        fillRule: "evenodd",
      })
    : state.completed
      ? h("path", {
          d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Z M6.5 12l1.4-1.4 2.8 2.8 5.5-5.5 1.4 1.4-6.9 6.9Z",
          fillRule: "evenodd",
        })
      : h(
          React.Fragment,
          null,
          h("circle", { cx: 12, cy: 12, r: 12 }),
          h(
            MarkText,
            {
              className: "MuiStepIcon-text",
              x: 12,
              y: 12,
              textAnchor: "middle",
              dominantBaseline: "central",
            },
            icon,
          ),
        );
  const cls = [
    "MuiStepIcon-root",
    state.active && "Mui-active",
    state.completed && "Mui-completed",
    error && "Mui-error",
  ]
    .filter(Boolean)
    .join(" ");
  return h(Mark, { ownerState: { ...state, error }, className: cls }, children);
}
const Stepper = React.forwardRef(function Stepper(input, ref) {
  const {
    children,
    activeStep = 0,
    orientation = "horizontal",
    nonLinear = false,
    alternativeLabel = false,
    component = "ol",
    connector,
    classes,
    className,
    ...rest
  } = useThemeProps({ name: "MuiStepper", props: input });
  const flow = React.useMemo(
    () => ({ activeStep, orientation, nonLinear, alternativeLabel, connector }),
    [activeStep, orientation, nonLinear, alternativeLabel, connector],
  );
  const items = React.Children.toArray(children).filter(React.isValidElement);
  return h(
    Flow.Provider,
    { value: flow },
    h(
      StepperRoot,
      {
        ...rest,
        ref,
        as: component,
        ownerState: flow,
        className: [
          names(
            stepperClasses,
            classes,
            "root",
            orientation,
            nonLinear && "nonLinear",
            alternativeLabel && "alternativeLabel",
          ),
          className,
        ]
          .filter(Boolean)
          .join(" "),
      },
      items.map((item, i) =>
        React.cloneElement(item, {
          index: item.props.index ?? i,
          last: item.props.last ?? i === items.length - 1,
        }),
      ),
    ),
  );
});
const Step = React.forwardRef(function Step(input, ref) {
  const flow = React.useContext(Flow);
  const {
    children,
    index = 0,
    last = false,
    component = "li",
    active = index === flow.activeStep,
    completed = !flow.nonLinear && index < flow.activeStep,
    disabled = !flow.nonLinear && index > flow.activeStep,
    expanded = false,
    classes,
    className,
    ...rest
  } = useThemeProps({ name: "MuiStep", props: input });
  const state = { ...flow, index, last, active, completed, disabled, expanded };
  const alt = flow.alternativeLabel;
  const link =
    flow.connector === undefined
      ? h(
          Connector,
          {
            ownerState: state,
            className: [
              "MuiStepConnector-root",
              "MuiStepConnector-" + flow.orientation,
              alt && "MuiStepConnector-alternativeLabel",
              active && "Mui-active",
              completed && "Mui-completed",
              disabled && "Mui-disabled",
            ]
              .filter(Boolean)
              .join(" "),
          },
          h("span", { className: "MuiStepConnector-line" }),
        )
      : flow.connector;
  return h(
    Position.Provider,
    { value: state },
    h(
      StepRoot,
      {
        "aria-current": active ? "step" : undefined,
        ...rest,
        as: component,
        ref,
        ownerState: state,
        className: [
          names(
            stepClasses,
            classes,
            "root",
            flow.orientation,
            alt && "alternativeLabel",
            completed && "completed",
          ),
          className,
        ]
          .filter(Boolean)
          .join(" "),
      },
      index > 0 && link,
      children,
    ),
  );
});
const StepLabel = React.forwardRef(function StepLabel(input, ref) {
  const state = React.useContext(Position);
  const {
    children,
    icon = state.index === undefined ? undefined : state.index + 1,
    optional,
    error = false,
    className,
    classes,
    ...rest
  } = useThemeProps({ name: "MuiStepLabel", props: input });
  const orientation = state.orientation || "horizontal",
    alt = state.alternativeLabel && "alternativeLabel";
  const cls = (...keys) => names(stepLabelClasses, classes, ...keys);
  const flags = [
    state.active && "active",
    state.completed && "completed",
    state.disabled && "disabled",
    error && "error",
    alt,
  ];
  return h(
    LabelRoot,
    {
      ...rest,
      ref,
      ownerState: { ...state, orientation, error },
      className: [
        cls(
          "root",
          orientation,
          state.disabled && "disabled",
          error && "error",
          alt,
        ),
        className,
      ]
        .filter(Boolean)
        .join(" "),
    },
    icon != null &&
      h(
        "span",
        { className: cls("iconContainer", ...flags) },
        h(StepMark, { state, error, icon }),
      ),
    h(
      "span",
      { className: cls("labelContainer", alt) },
      children != null &&
        h("span", { className: cls("label", ...flags) }, children),
      optional,
    ),
  );
});
module.exports = {
  Stepper,
  Step,
  StepLabel,
  stepperClasses,
  stepClasses,
  stepLabelClasses,
  getStepperUtilityClass: (slot) => utility("MuiStepper", slot),
  getStepUtilityClass: (slot) => utility("MuiStep", slot),
  getStepLabelUtilityClass: (slot) => utility("MuiStepLabel", slot),
};
