import { createElement } from "react";
import {
  Manager,
  Reference,
  Popper,
  type Placement,
  type PopperChildrenProps,
  type Modifier,
} from "vreact-popper";
const placement: Placement = "bottom-start";
const modifiers: Modifier[] = [
  { name: "offset", options: { offset: [0, 8] } },
  { name: "flip", options: { padding: 4 } },
];
const child = ({
  ref,
  style,
  placement,
  arrowProps,
  update,
}: PopperChildrenProps) =>
  createElement(
    "div",
    { ref, style, "data-placement": placement, onClick: () => void update() },
    createElement("i", { ref: arrowProps.ref, style: arrowProps.style }),
    "Contest menu",
  );
const tree = createElement(
  Manager,
  null,
  createElement(Reference, {
    children: ({ ref }) => createElement("button", { ref }, "Contest"),
  }),
  createElement(Popper, { placement, modifiers, children: child }),
);
void tree;
// @ts-expect-error arbitrary modifier callbacks are not part of this navigation adapter
const bad: Modifier = { name: "custom", fn() {} };
// @ts-expect-error automatic placement is outside the explicit navigation contract
const unsupported: Placement = "auto";
