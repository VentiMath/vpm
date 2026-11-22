"use strict";
const React = require("react");
const Position = require("./step-position.cjs");
const { styled, useThemeProps } = require("./theme.cjs");
const { Collapse } = require("./collapses.cjs");
const {
  unstable_generateUtilityClass: utility,
  unstable_generateUtilityClasses: utilities,
} = require("vmui-utils");
const stepContentClasses = utilities("MuiStepContent", [
  "root",
  "last",
  "transition",
]);
const getStepContentUtilityClass = (slot) => utility("MuiStepContent", slot);
const join = (...values) => values.filter(Boolean).join(" ");
const Root = styled("div", {
  name: "MuiStepContent",
  slot: "Root",
  overridesResolver: ({ ownerState }, o) => [o.root, ownerState.last && o.last],
})(({ theme, ownerState: { last, alternativeLabel } }) => {
  const end = alternativeLabel ? "Right" : "Left",
    other = alternativeLabel ? "Left" : "Right";
  const color =
    theme.vars?.palette?.StepContent?.border ??
    (theme.palette.mode === "dark"
      ? (theme.palette.grey?.[600] ?? "#757575")
      : (theme.palette.grey?.[400] ?? "#bdbdbd"));
  return {
    ["margin" + end]: 12,
    ["padding" + end]: 20,
    ["padding" + other]: 8,
    ["border" + end]: last ? "none" : "1px solid " + color,
  };
});
const Body = styled(Collapse, {
  name: "MuiStepContent",
  slot: "Transition",
  overridesResolver: (_, o) => o.transition,
})({});
const StepContent = React.forwardRef(function StepContent(input, ref) {
  const props = useThemeProps({ name: "MuiStepContent", props: input });
  const {
    children,
    className,
    classes,
    slots,
    slotProps,
    transitionDuration = "auto",
    ...rest
  } = props;
  const {
    active = false,
    expanded = false,
    last = false,
    alternativeLabel = false,
  } = React.useContext(Position);
  const ownerState = { ...props, last, alternativeLabel };
  const custom = slots?.transition,
    slot = slotProps?.transition;
  const transition = typeof slot === "function" ? slot(ownerState) : slot;
  const timeout =
    transitionDuration === "auto" &&
    custom &&
    custom !== Collapse &&
    !custom.muiSupportAuto
      ? undefined
      : transitionDuration;
  return React.createElement(
    Root,
    {
      ...rest,
      ref,
      ownerState,
      className: join(
        stepContentClasses.root,
        classes?.root,
        last && stepContentClasses.last,
        last && classes?.last,
        className,
      ),
    },
    React.createElement(
      custom || Body,
      {
        in: active || expanded,
        timeout,
        unmountOnExit: true,
        ...transition,
        ...(!custom || typeof custom !== "string" ? { ownerState } : {}),
        className: join(
          stepContentClasses.transition,
          classes?.transition,
          transition?.className,
        ),
      },
      children,
    ),
  );
});
module.exports = {
  StepContent,
  stepContentClasses,
  getStepContentUtilityClass,
};
