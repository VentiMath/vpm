# vreact-i18next

Independent React translation hooks and provider for VentiMath. Targets **react-i18next 18.0.1**, with comparisons against the app's **15.4.1**, on React **19.3.1**.

```jsx
import { createInstance } from 'vi18next';
import { I18nextProvider, useTranslation } from 'vreact-i18next';

const i18n = createInstance();
await i18n.init({
  lng: 'en', defaultNS: 'contests',
  resources: { en: { contests: { TITLE: 'Contest archive' } } },
});
function ContestTitle() {
  const { t } = useTranslation('contests');
  return <h1>{t('TITLE')}</h1>;
}
<I18nextProvider i18n={i18n}><ContestTitle /></I18nextProvider>;
```

## Verified application contract

`useTranslation`, `I18nextProvider`, `I18nContext`, `initReactI18next`, engine getters/setters and subscription defaults cover the audited app: 160 hook imports, one initialization-plugin import and four provider imports. Tuple and named results, namespaces, string key prefixes, language overrides, provider precedence, resource subscriptions, Suspense and `ready: false` loading are included. The wrapper works with both upstream comparison engines and `vi18next`.

`useSyncExternalStore` supplies stable snapshots. Unrelated parent updates preserve translators, DOM, focus and selection. Engine/store subscriptions are cleaned up on unmount or configuration changes. Concurrent namespace loads share one pending promise. No translated-result cache can conceal resource updates.

There is no rich-text HTML parser, `Trans`, `Translation`, HOC, SSR state-injection helper or complete upstream resource-schema type inference. None of those exports has a caller in the audited application. Ordinary translated text uses React's normal escaping. `vi18next` is the declared VPM dependency; React is a peer. The engine's documented resource-only loading scope still applies.

[Conformance](../../scripts/react-i18next-conformance/README.md) covers current and app-pinned controls, Node/Bun, React production/development browser behavior, strict TypeScript and packed consumers. [Benchmarks](bench/results/README.md) isolate the wrapper with the **same translation engine and React version** in each implementation. They measure SSR work, not application navigation or browser frame rate. [Provenance](PROVENANCE.json) records the independently written scope. Source completion does not imply publication or adoption.
