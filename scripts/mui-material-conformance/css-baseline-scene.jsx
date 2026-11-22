import React from "react";
import Baseline from "@baseline";
import { ThemeProvider } from "@mui/system";
export function makeTheme(mode = "light", selector, override = false) {
  const palette = {
    mode,
    text: { primary: mode === "light" ? "#243140" : "#e8e1dc" },
    background: { default: mode === "light" ? "#ededfa" : "#192432" },
    common: { white: "#fff" },
  };
  const typography = {
    body1: {
      fontFamily: "Georgia, serif",
      fontWeight: 450,
      fontSize: "18px",
      lineHeight: 1.4,
    },
    fontWeightBold: 750,
  };
  const theme = {
    palette,
    typography,
    components: {
      MuiCssBaseline: override
        ? {
            defaultProps: { enableColorScheme: true },
            styleOverrides: {
              body: { paddingLeft: 9 },
              ".accent": { color: "#168531" },
            },
          }
        : {},
    },
  };
  if (selector) {
    theme.vars = {
      palette: {
        ...palette,
        background: { default: "var(--surface, #ededfa)" },
      },
    };
    theme.colorSchemes = {
      light: { palette: { mode: "light" } },
      dark: { palette: { mode: "dark" } },
    };
    theme.getColorSchemeSelector = (name) =>
      selector === "media"
        ? "@media (prefers-color-scheme: " + name + ")"
        : selector === "class"
          ? "." + name + " &"
          : "[data-" + name + "] &";
  }
  return theme;
}
export function Scene({ theme, scheme, child = true }) {
  const element = (
    <Baseline enableColorScheme={scheme}>
      {child && <strong className="accent">Practice</strong>}
    </Baseline>
  );
  return theme ? (
    <ThemeProvider theme={theme} themeId="$$material">
      {element}
    </ThemeProvider>
  ) : (
    element
  );
}
