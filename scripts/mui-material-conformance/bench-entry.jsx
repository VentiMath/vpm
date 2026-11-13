import React from "react";
import { renderToString } from "react-dom/server";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Button, IconButton, ToggleButton, ToggleButtonGroup } from "@buttons";
const theme = createTheme({
  components: {
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500 },
        sizeSmall: { minHeight: 28, padding: "6px 12px" },
      },
    },
  },
});
export function prepare(kind) {
  const children =
    kind === "buttons" ? (
      Array.from({ length: 12 }, (_, i) => (
        <Button
          key={i}
          variant={i % 2 ? "outlined" : "contained"}
          disabled={i === 11}
          startIcon={<span>+</span>}
          sx={{ m: 1 }}
        >
          Contest {i}
        </Button>
      ))
    ) : kind === "icons" ? (
      Array.from({ length: 12 }, (_, i) => (
        <IconButton
          key={i}
          aria-label={"Action " + i}
          size="small"
          disabled={i === 11}
        >
          <span>+</span>
        </IconButton>
      ))
    ) : (
      <ToggleButtonGroup value={[1, 3]} size="small">
        {Array.from({ length: 7 }, (_, i) => (
          <ToggleButton key={i} value={i}>
            Day {i}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  const tree = <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  return () => renderToString(tree);
}
