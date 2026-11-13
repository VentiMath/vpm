import * as React from "react";
import styled, {
  GlobalStyles,
  StyledEngineProvider,
  css,
  keyframes,
  internal_serializeStyles,
  type CSSObject,
  type CreateMUIStyled,
} from "vmui-styled-engine";
import Global from "vmui-styled-engine/GlobalStyles";
import Provider from "vmui-styled-engine/StyledEngineProvider";
const Button = styled("button")<{ tone: string }>(({ tone }) => ({
  color: tone,
}));
React.createElement(Button, { tone: "blue", onClick: () => {} });
// @ts-expect-error tone is required
React.createElement(Button, {});
const styles: CSSObject = { padding: 2, "&:hover": { opacity: 0.8 } };
internal_serializeStyles(styles);
css(styles);
keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
React.createElement(GlobalStyles<{ color: string }>, {
  styles: (t) => ({ body: { color: t.color } }),
  defaultTheme: { color: "red" },
});
React.createElement(Global, { styles });
React.createElement(Provider, null);
// @ts-expect-error app-owned cache policy excludes provider-managed caches
React.createElement(StyledEngineProvider, { injectFirst: true });
declare const mui: CreateMUIStyled<
  { theme?: { color: string }; sx?: CSSObject },
  { name?: string },
  { color: string }
>;
const Mui = mui("button", { name: "Test" })<{ compact: boolean }>(
  ({ theme, compact }) => ({ color: theme.color, padding: compact ? 2 : 4 }),
);
React.createElement(Mui, { compact: true });
// @ts-expect-error compact must be a boolean
React.createElement(Mui, { compact: "yes" });
