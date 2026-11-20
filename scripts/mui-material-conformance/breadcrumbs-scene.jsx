import React from "react";
import { Breadcrumbs, Typography } from "@buttons";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@integration";

const segments = [
  ["Home", "/"],
  ["Contests", "/contests"],
  ["AIME", "/contests/aime"],
  ["Exams", "/contests/aime/exams"],
  ["2025", "/contests/aime/exams/2025"],
  ["Problem 7", "/contests/aime/exams/2025/7"],
];
const routerLink = React.forwardRef(({ to, ...props }, ref) => <a ref={ref} href={to} {...props} />);
export function Trail({
  count = 6,
  last,
  skipHome = false,
  limit = 4,
  before = 1,
  after = 1,
  custom = false,
  separator,
  component = "nav",
  expandText,
  mark = false,
}) {
  const rows = segments.slice(skipHome ? 1 : 0, count);
  return (
    <Breadcrumbs
      id={mark ? "trail" : undefined}
      aria-label="breadcrumb"
      component={component}
      className="app-trail"
      classes={{ ol: "list-none m-0 p-0" }}
      maxItems={limit}
      itemsBeforeCollapse={before}
      itemsAfterCollapse={after}
      separator={separator}
      expandText={expandText}
      slots={custom ? { CollapsedIcon: () => <i data-icon="ellipsis" /> } : undefined}
      color="action.active"
      sx={{ borderColor: "divider!important" }}
    >
      {rows.map(([label, to], i) => (
        <Typography
          component={routerLink}
          to={to}
          key={to}
          role="button"
          color="inherit"
          className={last && i === rows.length - 1 ? "normal-case" : "capitalize"}
        >
          {last && i === rows.length - 1 ? last : label}
        </Typography>
      ))}
    </Breadcrumbs>
  );
}
export function BreadcrumbsScene({ app = true, dark = false, rtl = false, ...props } = {}) {
  const theme = React.useMemo(
    () =>
      createTheme({
        direction: rtl ? "rtl" : "ltr",
        cssVariables: app,
        palette: { mode: dark ? "dark" : "light" },
        spacing: app ? "0.5rem" : 8,
        components: app
          ? {
              MuiBreadcrumbs: {
                defaultProps: { separator: "›" },
                styleOverrides: {
                  separator: {
                    marginLeft: "calc(var(--mui-spacing) * 1.25)",
                    marginRight: "calc(var(--mui-spacing) * 1.25)",
                  },
                },
              },
            }
          : {},
      }),
    [app, dark, rtl],
  );
  return (
    <ThemeProvider theme={theme}>
      <main dir={rtl ? "rtl" : "ltr"}>
        <Trail mark {...props} />
      </main>
    </ThemeProvider>
  );
}
export function HydrationScene() {
  return (
    <div id="hydrated">
      <Trail mark />
    </div>
  );
}
