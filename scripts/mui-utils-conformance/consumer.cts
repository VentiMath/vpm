import * as React from "react";
import {
  deepmerge,
  unstable_useControlled,
  unstable_useEventCallback,
  unstable_useForkRef,
  unstable_generateUtilityClasses,
} from "vmui-utils";
import mergeSlotProps from "vmui-utils/mergeSlotProps";
import {
  useRovingTabIndexRoot,
  useRovingTabIndexItem,
  RovingTabIndexContext,
} from "vmui-utils/useRovingTabIndex";
import {
  Button,
  MenuList,
  MenuItem,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
const merged = deepmerge({ value: 1 }, { value: 2 });
merged.value.toFixed();
// @ts-expect-error retained target shape
merged.other;
const classes = unstable_generateUtilityClasses("MuiThing", [
  "root",
  "label",
] as const);
classes.root.toUpperCase();
// @ts-expect-error keys remain specific
classes.other;
function Example() {
  const [value, set] = unstable_useControlled({
    controlled: undefined,
    default: "a",
    name: "Example",
  });
  value.toUpperCase();
  set("b");
  const f = unstable_useEventCallback((n: number) => n + 1);
  const n: number = f(1);
  // @ts-expect-error callback arguments preserved
  f("wrong");
  const ref = unstable_useForkRef(React.useRef<HTMLButtonElement>(null));
  return React.createElement(Button, { ref, onClick: () => {}, children: n });
}
function Roving() {
  const root = useRovingTabIndexRoot<string>({ orientation: "vertical" });
  root.registerItem({
    id: "x",
    element: null,
    disabled: false,
    focusableWhenDisabled: false,
    selected: false,
  });
  return React.createElement(
    RovingTabIndexContext.Provider,
    { value: root },
    React.createElement(Example),
  );
}
const props = mergeSlotProps({
  additionalProps: { id: "x" },
  externalSlotProps: { title: "Math" },
}).props;
props.id.toUpperCase();
props.title.toUpperCase();
React.createElement(
  MenuList,
  null,
  React.createElement(MenuItem, null, "Contest"),
);
React.createElement(TextField, { label: "Contest" });
React.createElement(
  Tabs,
  { value: 0 },
  React.createElement(Tab, { label: "Problems" }),
);
