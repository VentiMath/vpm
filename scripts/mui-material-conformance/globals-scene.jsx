import React from "react";
import GlobalStyles from "@global-styles";
import { ThemeProvider } from "@emotion/react";

export const navigation = {
  ".nav": { "& .item": { minHeight: 36 }, "&.dense .item": { minHeight: 32 } },
};
export const frameSheets = [
  { ":root": { "--preview-size": "19px" } },
  { ".sample": { fontSize: "var(--preview-size)" } },
];
export const page = (theme) => ({
  "#toolbar": { position: "sticky", top: 0 },
  ".sample": { color: theme.palette.primary.main },
  "@media (min-width: 400px)": { ".nav": { width: 248 } },
});
export const theme = { palette: { primary: { main: "rgb(12, 34, 56)" } } };
export function Scene({ styles, suppliedTheme = theme }) {
  return (
    <ThemeProvider theme={{ $$material: suppliedTheme }}>
      <GlobalStyles styles={styles} />
    </ThemeProvider>
  );
}
