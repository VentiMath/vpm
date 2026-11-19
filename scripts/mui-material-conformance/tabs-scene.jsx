import React from "react";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@integration";
import { Tab, Tabs } from "@buttons";

const labels = ["Countries", "Contestants", "Problems", "imo-official.org"];
const learners = [
  ["kid-a", "Alex"],
  ["kid-b", "Morgan"],
  ["kid-c", "Chris"],
];
function icon(index) {
  return (
    <svg width="24" height="24" aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r={index + 4} />
    </svg>
  );
}
export function Panel({
  kind = "imo",
  initial,
  reverse = false,
  long = false,
  disabled = false,
  orientation = "horizontal",
  variant = "standard",
  centered = false,
  selectionFollowsFocus = false,
  tick = 0,
  ids = false,
}) {
  const family = kind === "family";
  const [value, setValue] = React.useState(initial === undefined ? (family ? "kid-b" : 0) : initial);
  const rows = reverse ? learners.toReversed() : learners;
  function select(event, next) {
    window.events?.push(next);
    if (family || next !== 3) setValue(next);
  }
  return (
    <Tabs
      id={ids ? "sample" : undefined}
      aria-label={family ? "Learners" : "IMO results"}
      value={value}
      onChange={select}
      orientation={orientation}
      centered={centered}
      variant={variant}
      selectionFollowsFocus={selectionFollowsFocus}
      data-tick={tick}
      sx={family ? undefined : { mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      {family
        ? rows.map(([kid, name]) => (
            <Tab
              key={kid}
              value={kid}
              disabled={disabled && kid === "kid-b"}
              label={kid === "kid-a" && long ? "Alexandra, the first learner" : name}
            />
          ))
        : labels.map((label, i) => (
            <Tab
              key={label}
              icon={icon(i)}
              disabled={disabled && i === 1}
              label={long && i === 0 ? "Translated country results" : label}
            />
          ))}
    </Tabs>
  );
}
const components = {
  MuiTab: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        textTransform: "none",
        minWidth: 28,
        minHeight: 28,
        padding: "4px 12px",
        zIndex: 1,
        "&.Mui-selected": { color: "var(--mui-palette-text-primary)" },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        padding: 4,
        backgroundColor: "var(--mui-palette-FilledInput-bg)",
        borderRadius: 8,
        minHeight: "auto",
        width: "fit-content",
      },
      indicator: {
        minHeight: "100%",
        bottom: 0,
        top: 0,
        backgroundColor: "var(--mui-palette-background-paper)",
        zIndex: 0,
        borderRadius: 6,
        boxShadow: "none",
        border: "1px solid var(--mui-palette-divider)",
      },
    },
  },
};
export function TabsScene({ kind = "imo", initial, app = false, rtl = false, dark = false, ...props } = {}) {
  const theme = React.useMemo(
    () =>
      createTheme({
        direction: rtl ? "rtl" : "ltr",
        palette: { mode: dark ? "dark" : "light" },
        cssVariables: app,
        components: app ? components : {},
      }),
    [app, rtl, dark],
  );
  return (
    <ThemeProvider theme={theme}>
      <main dir={rtl ? "rtl" : "ltr"}>
        <button id="before">Before</button>
        <Panel key={kind + String(initial)} kind={kind} initial={initial} ids {...props} />
        <button id="after">After</button>
      </main>
    </ThemeProvider>
  );
}
export function HydrationScene() {
  return (
    <Tabs value="learner">
      <Tab id="hydrated" label="Learner" value="learner" />
    </Tabs>
  );
}
