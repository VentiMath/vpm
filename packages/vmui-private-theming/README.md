# vmui-private-theming

Independent **MUI private-theming 9.5.0** context for React 19.3, compared with both current MUI System and the app's 7.2.0 caller. React is the only peer; there are no runtime dependencies.

```jsx
import { ThemeProvider, useTheme } from 'vmui-private-theming';
<ThemeProvider theme={{ color: 'blue' }}>{children}</ThemeProvider>;
```

Object themes shallowly override the outer theme. Functional themes receive the outer value and replace it with their result. The `mui.nested` symbol records nesting. Source objects remain unchanged, including frozen objects and symbol keys; memoized composition keeps context identity stable when the inputs do not change.

`useTheme` returns `null` outside a provider, and the declarations expose that actual behavior. Theme callbacks must return a non-array object. Invalid values fail explicitly in every environment. The package does not create Material themes, generate CSS, supply a styling engine or implement legacy JSS. Its provider/hook root exports and subpaths are the verified application contract; development warning wording is not reproduced.

[Conformance](../../scripts/mui-theming-conformance/README.md) exercises unchanged MUI System ThemeProvider/Box on Node, Bun and Chrome, including nested colors, stable memo consumers, retained focus and cleanup. [Benchmarks](bench/results/README.md) measure React server rendering. [Provenance](PROVENANCE.json) records independent scope. Publication and adoption remain separate.
