import * as React from "react";
import { styled, Box, ThemeProvider, createTheme } from "@mui/system";
const theme = createTheme({ palette: { primary: { main: "#123456" } } });
const Button = styled("button", { name: "Probe" })<{ compact: boolean }>(
  ({ theme, compact }) => ({
    color: theme.palette.primary.main,
    padding: compact ? 2 : 4,
  }),
);
React.createElement(Button, { compact: true });
React.createElement(ThemeProvider, {
  theme,
  children: React.createElement(Box, { sx: { color: "primary.main" } }),
});
// @ts-expect-error app props remain typed through unchanged MUI
React.createElement(Button, { compact: "yes" });
