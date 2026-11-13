import * as React from "react";
import {
  Button,
  ButtonBase,
  IconButton,
  Fab,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  type ButtonProps,
  type IconButtonProps,
  type ButtonBaseActions,
} from "vmui-material";
import ButtonEntry, {
  buttonClasses,
  getButtonUtilityClass,
} from "vmui-material/Button";
import { createTheme, ThemeProvider } from "vmui-system";
const theme = createTheme({ spacing: 4 });
const Route = React.forwardRef<
  HTMLAnchorElement,
  { to: string; children?: React.ReactNode }
>((p, ref) => React.createElement("a", { ref, href: p.to }, p.children));
const action = React.createRef<ButtonBaseActions>();
const props: ButtonProps = {
  variant: "contained",
  size: "small",
  startIcon: "+",
  sx: { p: { xs: 1, md: 2 } },
  action,
};
const icon: IconButtonProps = {
  edge: "start",
  size: "small",
  loading: false,
  "aria-label": "Menu",
};
const controls = [
  Button(props),
  ButtonEntry({
    href: "/contest",
    target: "_blank",
    ref: React.createRef<HTMLAnchorElement>(),
  }),
  Button({ component: Route, to: "/resources", children: "Resources" }),
  ButtonBase({
    component: "div",
    onKeyDown: (event) => event.currentTarget.focus(),
  }),
  IconButton(icon),
  Fab({ variant: "extended", color: "secondary" }),
  ButtonGroup({
    orientation: "vertical",
    children: [Button({ children: "Next" })],
  }),
  ToggleButton({
    value: 3,
    selected: true,
    onChange: (_, value) => void value,
  }),
  ToggleButtonGroup({
    value: [1, 2],
    onChange: (_, days: number[]) => days.length,
  }),
  React.createElement(ThemeProvider, {
    theme,
    children: Button({ children: "Join" }),
  }),
];
buttonClasses.root;
getButtonUtilityClass("root");
action.current?.focusVisible();
// @ts-expect-error invalid size
Button({ size: "tiny" });
// @ts-expect-error missing required router destination
Button({ component: Route });
// @ts-expect-error href selects an anchor ref
Button({ href: "/contest", ref: React.createRef<HTMLButtonElement>() });
// @ts-expect-error loading must be a boolean or null
IconButton({ loading: "yes" });
void controls;
