# i18next application conformance

Current engine **27.1.1**, application engine **25.0.1**, unchanged React adapters **18.0.1/15.4.1**, React **19.3.1**. Controls are fixture-only dependencies.

- `run.cjs`: 22,830 comparisons, including 224 repeated instances of explicitly asserted differences in nested translations/diagnostic mode and consistent empty/null key-presence checks. Unexpected mismatches fail. Checks cover 11 app languages plus regional and unknown-language fallback, plurals/context, namespaces, interpolation, escaping, resource writes and fixed translators.
- Package regression tests: own-property/prototype keys, input isolation, bounded cycles, nesting/variable separation, instance isolation and unsubscribing listeners.
- `callers.cjs`: read-only private application audit at a Git revision; loads only translation-module data in a restricted VM. The committed [metadata](app-audit.json) records 183 bundles, 22 namespaces, 11 languages and 74,628 comparisons with zero current/app differences. Source text is not shipped. This audit is local; CI does not require private application access.
- `browser.cjs`: real Chrome checks of both unchanged React adapters with current/app controls. Verifies ordinary and rich text, language changes, regional/English fallback, RTL and additions/removals to a live resource bundle.
- `types.cjs`: strict TypeScript 7 consumers and actual current React adapter declarations in NodeNext and bundler modes. Public types describe the string-key app API; full upstream resource-schema inference is not claimed.
- `archives.cjs`: exact tarballs under both `vi18next` and the `i18next` alias in clean/frozen npm/Bun installs, public exports, React server rendering and declarations.

```sh
npm --prefix scripts/i18next-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/i18next-conformance/run.cjs
bun scripts/i18next-conformance/run.cjs
node --test packages/vi18next/test/translations.test.cjs
bun test packages/vi18next/test/translations.test.cjs
node scripts/i18next-conformance/types.cjs
node scripts/i18next-conformance/browser.cjs
node scripts/i18next-conformance/archives.cjs
# Optional read-only application audit:
VENTIMATH_REPO=/path/to/app VENTIMATH_REF=origin/main node scripts/i18next-conformance/callers.cjs
```

[Measurements](../../packages/vi18next/bench/results/README.md) use isolated balanced process pairs and identical-source controls. Runtime implementations and relevant fixture inputs are hashed; inconclusive results remain labeled as such.
