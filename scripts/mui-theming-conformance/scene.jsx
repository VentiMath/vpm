import React from "react";
import {
  ThemeProvider,
  createTheme,
  Box,
  useTheme as useSystemTheme,
} from "@mui/system";
import { useTheme as usePrivateTheme } from "@mui/private-theming";
export function ReadTheme() {
  const system = useSystemTheme(),
    priv = usePrivateTheme();
  return (
    <output
      data-private={priv.palette.primary.main}
      data-nested={String(priv[Symbol.for("mui.nested")])}
    >
      {system.palette.primary.main}
    </output>
  );
}
export function Scene({ color = "#123456", nested = false, children }) {
  const theme = React.useMemo(
    () =>
      createTheme({ palette: { primary: { main: color } }, direction: "ltr" }),
    [color],
  );
  const content = (
    <Box component="section" sx={{ color: "primary.main", padding: 2 }}>
      <ReadTheme />
      {children}
    </Box>
  );
  return (
    <ThemeProvider theme={theme}>
      {nested ? (
        <ThemeProvider
          theme={(outer) => ({
            ...outer,
            palette: { ...outer.palette, primary: { main: "#abcdef" } },
          })}
        >
          {content}
        </ThemeProvider>
      ) : (
        content
      )}
    </ThemeProvider>
  );
}
