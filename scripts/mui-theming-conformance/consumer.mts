import * as React from "react";
import {
  ThemeProvider,
  useTheme,
  type DefaultTheme,
} from "vmui-private-theming";
import Provider from "vmui-private-theming/ThemeProvider";
import useScoped from "vmui-private-theming/useTheme";
interface Theme {
  color: string;
  spacing: number;
}
const node = React.createElement(
  ThemeProvider<Theme>,
  { theme: { color: "blue", spacing: 8 } },
  "Contest",
);
const functional = React.createElement(
  Provider<Theme>,
  { theme: (outer) => ({ color: outer?.color || "black", spacing: 4 }) },
  node,
);
function Consumer() {
  const theme = useTheme<Theme>();
  const scoped = useScoped<Theme>();
  return React.createElement("b", null, theme?.color, scoped?.spacing);
}
void [functional, Consumer];
const value: DefaultTheme = {};
void value;
// @ts-expect-error primitive themes are not valid
React.createElement(ThemeProvider, { theme: 12 });
