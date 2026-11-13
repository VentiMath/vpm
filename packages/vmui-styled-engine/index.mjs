import * as namespace from "./index.cjs";
// Node preserves the CommonJS namespace as default; Bun unwraps __esModule.
const api =
  typeof namespace.default === "function" ? namespace : namespace.default;
export default api.default;
export const {
  ThemeContext,
  keyframes,
  css,
  GlobalStyles,
  StyledEngineProvider,
  internal_mutateStyles,
  internal_serializeStyles,
} = api;
