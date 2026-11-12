# React translation wrapper conformance

The independent `vreact-i18next` runtime targets **18.0.1**. Controls include the app's **15.4.1**, current **i18next 27.1.1**, app **25.0.1** and VPM's independent engine. React is **19.3.1** throughout.

- `run.cjs`: 882 server-render comparisons across engines, namespaces, fallback modes, key prefixes, provider defaults and language overrides.
- `packages/vreact-i18next/test/hooks.test.cjs`: initialization, instance precedence/isolation, fallback tuple identity, React escaping, prefixes and listener-free server rendering.
- `browser.cjs`: all six adapter/engine combinations at desktop/mobile widths. Parent updates preserve translator and input identity, focus and selection; language/resource changes refresh output; unmount removes listeners. Delayed resources exercise Suspense and `ready: false`. VPM shares pending namespace requests across retries; upstream may request them multiple times. Run with `VPM_REACT_MODE=development` for StrictMode checks.
- `types.cjs`: TypeScript 7 strict ESM/CommonJS and bundler consumers using actual providers, initialization and translated components.
- `archives.cjs`: npm/Bun clean and frozen installs, exact runtime/type bytes, both runtime entry points and strict types. The staged manifest points its VPM engine dependency at the verified local archive, as release packing will pin its public URL. No upstream registry fallback for VPM names is used.

```sh
npm --prefix scripts/react-i18next-conformance ci --ignore-scripts
node --test packages/vreact-i18next/test/hooks.test.cjs
bun test packages/vreact-i18next/test/hooks.test.cjs
node scripts/react-i18next-conformance/run.cjs
bun scripts/react-i18next-conformance/run.cjs
node scripts/react-i18next-conformance/types.cjs
node scripts/react-i18next-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/react-i18next-conformance/browser.cjs
node scripts/react-i18next-conformance/archives.cjs
```

The [isolated benchmark](../../packages/vreact-i18next/bench/results/README.md) holds the translation engine and React constant. Four balanced process pairs and two identical-source controls measure single-component and 25-component SSR. Browser frame time and application navigation are not measured. Upstream implementations are fixture dependencies, not copied into the VPM runtime.
