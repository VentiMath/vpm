# MUI theme-context conformance

Controls: **@mui/private-theming 9.5.0**, app **7.2.0**, unchanged **@mui/system 9.5.0/7.2.0**, React **19.3.1**.

The independent provider/hook has no runtime dependency beyond its React peer. `run.cjs` compares 1,202 root, nested-object, functional, frozen and symbol-key snapshots. Five regressions cover absent context, shallow nesting/input isolation, replacement callbacks, prototype-looking data and invalid themes. `callers.cjs` compares 12 unchanged MUI System ThemeProvider/Box snapshots with only the private context replaced.

Chrome checks both unchanged System versions in production and development/StrictMode: computed colors/padding, nested private/system context, stable memoized consumers after parent updates, focus/selection retention and teardown. TypeScript 7 checks the nullable hook and typed callbacks. Packed npm/Bun consumers verify fresh/frozen installs, root/subpath CJS/ESM identity and SSR.

```sh
npm --prefix scripts/mui-theming-conformance ci --ignore-scripts --legacy-peer-deps
node scripts/mui-theming-conformance/run.cjs
bun scripts/mui-theming-conformance/run.cjs
node --test packages/vmui-private-theming/test/theme.test.cjs
bun test packages/vmui-private-theming/test/theme.test.cjs
node scripts/mui-theming-conformance/callers.cjs
bun scripts/mui-theming-conformance/callers.cjs
node scripts/mui-theming-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/mui-theming-conformance/browser.cjs
node scripts/mui-theming-conformance/types.cjs
node scripts/mui-theming-conformance/archives.cjs
```

[Measurements](../../packages/vmui-private-theming/bench/results/README.md) use isolated balanced processes and consumed SSR results. They are not browser paint or whole-app performance claims. Theme creation, styling and legacy JSS remain separate work; invalid-theme warning text is not a compatibility guarantee.
