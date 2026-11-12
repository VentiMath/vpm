# vi18next

Independent translation engine for VentiMath's resource bundles, contest pages and language provider. Targets **i18next 27.1.1**, with application comparisons against **25.0.1**. No runtime dependencies or copied upstream runtime.

```js
import { createInstance } from 'vi18next';

const i18n = createInstance();
await i18n.init({
  lng: 'en', fallbackLng: 'en', keySeparator: false,
  resources: { en: { contests: { PROBLEMS_other: '{{count}} problems' } } },
});
i18n.t('PROBLEMS', { ns: 'contests', count: 12 });
```

## Application contract

The verified surface includes resource registration and updates, language/namespace fallback, fixed translators, interpolation, context, cardinal/ordinal plurals through `Intl.PluralRules`, language direction, instance/store events and the integration-plugin interface used by React. Root ESM/CommonJS and public declarations are included. String keys and ordinary directly supplied resource objects are the primary contract.

Both **react-i18next 18.0.1 and 15.4.1** run unchanged in the comparison fixtures on React 19.3.1. Their hooks, provider and rich-text component are exercised through language changes and resource subscriptions. The engine can support those existing callers before VPM replaces the React adapter.

VentiMath's audited configuration supplies English fallback, `keySeparator: false` and `interpolation.escapeValue: false`; React performs escaping for ordinary text. All **183 registered bundles, 22 namespaces and 11 languages** matched both controls in **74,628** read-only application checks. Private resource text is not included in this repository.

Network backends, language-detector plugins, postprocessors, ICU/MF2, the full formatter/plugin ecosystem and resource-schema type inference are outside scope. The package rejects non-integration plugins explicitly. Namespace/language loading methods handle already supplied resources; they do not download anything. Declarations support the string-key application API and current React adapter imports, not the upstream compiler's complete resource inference machinery.

## Intentional behavior and migration

- Resources and interpolation variables use own properties. Prototype-looking keys are ordinary data. Incoming resource objects are copied; mutating the original does not silently change translations. Cyclic/deep resource input and cyclic nesting fail with bounded diagnostics.
- `exists()` consistently reports stored key presence, including empty/null values. Current upstream inconsistently changes this answer when context or ordinal options select a different lookup path. `t()` still applies the configured display fallback.
- Nesting resolves before variable insertion. Variables cannot become translation instructions or disable legitimate nesting already present in the resource. Nested translations remain text when `returnDetails` is enabled; they do not become `[object Object]`.
- Version 27 defaults are used: no implicit `dev` fallback, empty strings use fallback by default, and slash is not HTML-escaped. English fallback and React escaping are explicit in the audited app. None of its audited bundles contains empty strings, and all audited outputs match its older version. Other consumers should set `returnEmptyString: true` or a fallback language explicitly if they need the older defaults.

These differences are covered by fixed tests and separated from matching-control cases. API error wording is not a compatibility promise. Source completion does not imply a published release or application adoption.

## Evidence

[Conformance fixtures](../../scripts/i18next-conformance/README.md) cover current/app engines and React adapters, browser behavior, strict TypeScript and actual packed installs. [Isolated benchmarks](bench/results/README.md) retain controls, process-order results and source hashes. [Provenance](PROVENANCE.json) records the target and independently written scope.
