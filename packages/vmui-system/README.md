# vmui-system

Independent **MUI System 9.5.0** theme, styling and layout primitives for VentiMath, checked beneath unchanged Material 9.5.0 and the app's 7.2.0 components on React 19.3.1. Runtime dependencies are `vmui-utils`, `vmui-private-theming` and `vmui-styled-engine`; React is a peer.

```js
import { Box, Stack, ThemeProvider, createTheme } from 'vmui-system';
const theme = createTheme({ spacing: 8 });
```

The verified surface includes theme creation, spacing and responsive breakpoints; `sx` tokens, callbacks, arrays and nested selectors; styled object and template interpolations, component overrides and variants; Box, Stack, Grid and Container; color transformations; CSS-variable preparation; nested themes and media-query subscriptions. CSS-variable light/dark changes, RTL, narrow/wide layouts and focused input preservation are exercised in Chrome. The test replaces the full VPM styling closure below Material, including Emotion.

Theme tokens use own-property lookup. Prototype-named style keys cannot alter output prototypes. Cyclic style and theme-variable inputs reject explicitly, as do nonfinite breakpoint widths. Shared acyclic input is supported. Runtime validation is retained in production.

This package targets the application's theme-supplied rendering. Pre-hydration color scripts throw explicitly; custom color-scheme persistence, transition suppression, alternative native CSS color algorithms and the legacy Grid component are outside the verified scope. It does not claim every upstream option or browser is covered. No application dependency has been switched by building this package.

The isolated Box/Stack SSR case takes 16.6% less time on Node. Bun theme creation, responsive sx and styled-override SSR remain slower by 61.2%, 87.7% and 30.4%; the other measured differences are inconclusive. These figures describe individual operations, not application speed.

[Conformance and archive checks](../../scripts/mui-system-conformance/README.md), [benchmarks](bench/results/README.md), and [provenance](PROVENANCE.json) document the evidence and limits. Supported runtimes are Node 24, Bun 1.4.4 and modern browsers.
