import React from "react";
import { Grid } from "@buttons";
import { ThemeProvider } from "@integration";
import { createTheme } from "@mui/material/styles";

const sizes = { xs: 12, sm: 6, md: 4 };
const theme = createTheme({
  spacing: "0.5rem",
  components: {
    MuiGrid: {
      styleOverrides: {
        root: { color: "rgb(12, 34, 56)" },
        container: { "--imo-grid-container": "yes" },
      },
    },
  },
});
export function YearGrid({
  loading = false,
  count = 9,
  spacing = 2,
  columns = 12,
  size = sizes,
  styled = false,
  nested,
  offset,
  onSelect,
  ...props
}) {
  const children = Array.from({ length: count }, (_, i) => (
    <Grid size={size} key={i} offset={offset}>
      {loading ? (
        <span data-placeholder="year" />
      ) : (
        <button onClick={() => onSelect?.(2026 - i)}>IMO {2026 - i}</button>
      )}
    </Grid>
  ));
  let content = children;
  if (nested) {
    const inner = (
      <Grid data-inner container size="grow">
        {children}
      </Grid>
    );
    content =
      nested === "direct" ? (
        inner
      ) : (
        <aside style={{ width: "100%" }}>{inner}</aside>
      );
  }
  const grid = (
    <Grid container data-archive spacing={spacing} columns={columns} {...props}>
      {content}
    </Grid>
  );
  return styled ? <ThemeProvider theme={theme}>{grid}</ThemeProvider> : grid;
}
export function HydrationScene() {
  return <YearGrid styled />;
}
