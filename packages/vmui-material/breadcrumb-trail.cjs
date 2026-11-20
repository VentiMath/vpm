"use strict";
const React = require("react");
const { styled, useThemeProps } = require("./theme.cjs");
const { Typography, SvgIcon } = require("./text.cjs");
const { ButtonBase } = require("./buttons.cjs");
const h = React.createElement;
const join = (...classes) => classes.filter(Boolean).join(" ");
function getBreadcrumbsUtilityClass(slot) {
  return "MuiBreadcrumbs-" + slot;
}
const breadcrumbsClasses = Object.freeze(
  Object.fromEntries(
    ["root", "ol", "li", "separator"].map((slot) => [slot, getBreadcrumbsUtilityClass(slot)]),
  ),
);
const Root = styled(Typography, {
  name: "MuiBreadcrumbs",
  slot: "Root",
  overridesResolver: (_, styles) => [styles.root, { "& .MuiBreadcrumbs-li": styles.li }],
})({});
const List = styled("ol", {
  name: "MuiBreadcrumbs",
  slot: "Ol",
  overridesResolver: (_, styles) => styles.ol,
})({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  padding: 0,
  margin: 0,
  listStyle: "none",
});
const Separator = styled("li", {
  name: "MuiBreadcrumbs",
  slot: "Separator",
  overridesResolver: (_, styles) => styles.separator,
})({
  display: "flex",
  userSelect: "none",
  marginLeft: 8,
  marginRight: 8,
});
const ExpandButton = styled(ButtonBase, {
  name: "MuiBreadcrumbCollapsed",
  slot: "Root",
  overridesResolver: (_, s) => s.root,
})(({ theme }) => {
  const palette = theme.vars?.palette || theme.palette;
  const dark = theme.palette.mode === "dark";
  const grey = palette.grey || {};
  return {
    display: "flex",
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    borderRadius: 2,
    backgroundColor: dark ? grey[700] || "#616161" : grey[100] || "#f5f5f5",
    color: dark ? grey[100] || "#f5f5f5" : grey[700] || "#616161",
    "&:hover, &:focus": { backgroundColor: dark ? grey[600] || "#757575" : grey[200] || "#eeeeee" },
    "&:active": {
      boxShadow: theme.shadows?.[0] || "none",
      backgroundColor: dark ? "#676767" : "#d1d1d1",
    },
  };
});
const More = styled(SvgIcon)({ width: 24, height: 16 });

const Breadcrumbs = React.forwardRef(function Breadcrumbs(input, ref) {
  const props = useThemeProps({ props: input, name: "MuiBreadcrumbs" });
  const {
    children,
    component = "nav",
    classes = {},
    className,
    separator = "/",
    expandText = "Show path",
    color = "textSecondary",
    itemsBeforeCollapse = 1,
    itemsAfterCollapse = 1,
    maxItems = 8,
    slots = {},
    slotProps = {},
    ...typography
  } = props;
  const [expanded, setExpanded] = React.useState(false);
  const list = React.useRef(null);
  const restoreFocus = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    list.current
      ?.querySelector('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')
      ?.focus();
  }, [expanded]);
  const cls = (slot) => join(breadcrumbsClasses[slot], classes[slot]);
  const state = { ...props, expanded };
  const crumbs = React.Children.toArray(children).filter(React.isValidElement);
  const before = Math.max(0, Math.trunc(itemsBeforeCollapse)),
    after = Math.max(0, Math.trunc(itemsAfterCollapse));
  const collapse = !expanded && crumbs.length > maxItems && before + after < crumbs.length;
  const visible = collapse
    ? [...crumbs.slice(0, before), null, ...crumbs.slice(crumbs.length - after)]
    : crumbs;
  const entries = [];
  function append(key, node) {
    if (entries.length)
      entries.push(
        h(
          Separator,
          { key: "sep:" + key, className: cls("separator"), ownerState: state, "aria-hidden": true },
          separator,
        ),
      );
    entries.push(node);
  }
  for (const child of visible) {
    if (child === null) {
      const iconProps =
        typeof slotProps.collapsedIcon === "function"
          ? slotProps.collapsedIcon(state)
          : slotProps.collapsedIcon;
      const glyph = slots.CollapsedIcon
        ? h(slots.CollapsedIcon, iconProps)
        : h(
            More,
            {
              ...(process.env.NODE_ENV !== "production" && { "data-testid": "MoreHorizIcon" }),
              ...iconProps,
            },
            ...[6, 12, 18].map((cx) => h("circle", { key: cx, cx, cy: 12, r: 2 })),
          );
      append(
        "expand",
        h(
          "li",
          { key: "expand" },
          h(
            ExpandButton,
            {
              ownerState: state,
              "aria-label": expandText,
              onClick: () => {
                restoreFocus.current = true;
                setExpanded(true);
              },
            },
            glyph,
          ),
        ),
      );
    } else {
      const key = "crumb:" + child.key;
      append(key, h("li", { key, className: cls("li") }, child));
    }
  }
  return h(
    Root,
    { ...typography, ref, component, color, ownerState: state, className: join(cls("root"), className) },
    h(List, { ref: list, ownerState: state, className: cls("ol") }, entries),
  );
});
module.exports = { Breadcrumbs, breadcrumbsClasses, getBreadcrumbsUtilityClass };
