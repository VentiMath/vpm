import React from "react";
import { ThemeProvider, createTheme, Box, styled } from "@mui/system";
import { GlobalStyles, StyledEngineProvider } from "@mui/styled-engine";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import rtlPlugin from "stylis-plugin-rtl";
// This is the cache policy from the audited app RootThemeProvider. Keeping it
// in the caller verifies the adapter does not silently replace the app cache.
const layer = (node) => {
  if (node.root) return;
  const child = { ...node, parent: node, root: node };
  Object.assign(node, {
    children: [child],
    length: 6,
    parent: null,
    props: ["mui"],
    return: "",
    root: null,
    type: "@layer",
    value: "@layer mui",
  });
};
const Button = styled("button", {
  name: "Probe",
  slot: "Root",
  shouldForwardProp: (p) => p !== "ownerState" && p !== "sx" && p !== "theme",
})(({ theme, ownerState }) => ({
  color: theme.palette.primary.main,
  padding: ownerState.compact ? 4 : 12,
  marginLeft: 7,
  "&:hover": { opacity: 0.7 },
}));
const Extended = styled(Button)({ borderWidth: 2, borderStyle: "solid" });
export function Scene({
  color = "#123456",
  nested = false,
  compact = false,
  direction = "ltr",
  children,
}) {
  const cache = React.useMemo(
    () =>
      createCache({
        key: direction === "rtl" ? "muirtl" : "muiltr",
        stylisPlugins: direction === "rtl" ? [rtlPlugin, layer] : [layer],
        prepend: false,
      }),
    [direction],
  );
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: { primary: { main: color } },
        components: {
          Probe: {
            styleOverrides: { root: { borderRadius: 3 } },
            variants: [
              {
                props: { variant: "outlined" },
                style: { backgroundColor: "#fedcba" },
              },
            ],
          },
        },
      }),
    [color],
  );
  const view = (
    <>
      <GlobalStyles
        styles={(t) => ({
          ".engine-global": { color: t.palette.primary.main, margin: 3 },
        })}
      />
      <Box
        component="section"
        sx={{
          color: "primary.main",
          padding: 2,
          "& span": { fontWeight: 700 },
        }}
      >
        <Extended
          data-probe
          ownerState={{ compact }}
          variant="outlined"
          sx={{ letterSpacing: 1 }}
        >
          Contest
        </Extended>
        <span>Problem</span>
        {children}
      </Box>
      <p className="engine-global">Global</p>
    </>
  );
  return (
    <StyledEngineProvider>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          {nested ? (
            <ThemeProvider
              theme={(outer) => ({
                ...outer,
                palette: { ...outer.palette, primary: { main: "#abcdef" } },
              })}
            >
              {view}
            </ThemeProvider>
          ) : (
            view
          )}
        </ThemeProvider>
      </CacheProvider>
    </StyledEngineProvider>
  );
}
