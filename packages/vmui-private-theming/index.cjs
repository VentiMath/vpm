"use strict";
const React = require("react");
const context = React.createContext(null),
  nested = Symbol.for("mui.nested");
function useTheme() {
  return React.useContext(context);
}
function ThemeProvider({ theme, children }) {
  const outer = useTheme();
  const value = React.useMemo(() => {
    const local = typeof theme === "function" ? theme(outer) : theme;
    if (local === null || typeof local !== "object" || Array.isArray(local))
      throw new TypeError(
        "ThemeProvider requires a theme object or a function returning one",
      );
    return {
      ...(typeof theme === "function" ? null : outer),
      ...local,
      [nested]: outer !== null,
    };
  }, [outer, theme]);
  return React.createElement(context.Provider, { value }, children);
}
module.exports = { ThemeProvider, useTheme };
