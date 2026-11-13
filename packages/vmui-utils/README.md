# vmui-utils

Independent **MUI Utils 9.5.0** helpers for the System and Material components VentiMath uses, checked against current 9.5.0 and the app's 7.2.0 controls on React 19.3. React is a peer; `vclsx` is the only runtime dependency.

The package includes object/default/slot-prop composition, class generation, DOM ownership and shadow-root helpers, refs, controlled state, stable event callbacks, timers, focus hooks, validators and MUI 9's roving menu/tab registry. Root names and individual subpaths match the verified caller imports. The [conformance fixture](../../scripts/mui-utils-conformance/README.md) substitutes the utility package beneath unchanged MUI forms, menus, tabs, dialogs and styling.

```js
import { deepmerge, unstable_useEventCallback } from 'vmui-utils';
import useForkRef from 'vmui-utils/useForkRef';
```

Prototype-named class slots are ordinary names, and recursive assignments preserve prototype-named own data without changing object prototypes. Cyclic source objects reject explicitly. Theme merges preserve React element identity and avoid changing source objects. Ref composition honors React 19 callback cleanups and attempts every cleanup even if one fails. Event callbacks read committed values; unmount cancels owned timers.

The roving registry sorts registered elements by their current DOM order, skips disabled items unless permitted, and handles wrapping, Home/End, orientation and RTL. MUI remains responsible for typeahead text rules, selection and application-specific actions. DOM ownership follows the supplied element/document, including shadow-root focus.

Supported environments are Node 24, Bun 1.4.4 and modern browsers with native `:focus-visible`. No legacy input-mode listener polyfill is installed; the compatibility `teardown` export therefore has no listeners to remove. React 19 function components may accept refs. Validators remain active, but their diagnostic wording is not copied. The `visuallyHidden` constant follows current MUI's `clipPath` recipe rather than the app's older `clip` recipe. The unused local-storage hook is outside this package's verified surface.

The isolated measurements show class composition taking 8.5% less time on Node and 12.2% less on Bun. The hook SSR case takes 12.9% less time on Node. Responsive object assignment still costs 230 ns versus 137 ns on Node; it includes source ownership, prototype-key handling and cycle rejection. Other differences do not exceed the controls consistently. These are helper measurements, not application speed claims.

[Types and archived installs](../../scripts/mui-utils-conformance/README.md) need neither `@mui/types` nor prop-types declarations. [Benchmarks](bench/results/README.md) measure utility operations and SSR, not browser interaction performance. [Provenance](PROVENANCE.json) records the independently written scope. Built source does not imply a published release or application adoption.
