# vradix-react-use-controllable-state

Independent React 19 implementation of Radix's state hooks, targeting
`@radix-ui/react-use-controllable-state` **1.3.0**. Built; unreleased and not yet adopted.

```js
import {useControllableState} from 'vradix-react-use-controllable-state';
const [open, setOpen] = useControllableState({prop: openProp, defaultProp: false, onChange: onOpenChange, caller: 'Menu'});
```

`prop !== undefined` selects controlled mode. The simple setter accepts a value
or updater, proposes controlled values through `onChange`, and commits uncontrolled
values with React state. Defaults are initial-only. Uncontrolled callbacks run
after commit and coalesce batched updates. Setters stay stable and use the latest
committed callback and prop. Development conditions warn on mode switches.

`useControllableStateReducer(reducer, options, initialArg, init?)` preserves extra
state fields and a stable dispatch. Controlled proposals notify **after commit**,
one per changing action, rather than inside the reducer. This intentionally fixes
upstream's duplicate StrictMode notifications and React 19.2 render-time errors.
Abandoned renders do not notify. Reducers and initializers must remain pure.
The controlled `state` field always reflects `prop`; ancillary fields are local.

Both hooks compare values with `Object.is`: repeated `NaN` does not notify, while
changing `-0` to `0` does. These differ deliberately from upstream's simple hook.
Only React 19 is supported. There is no pre-18 counter or legacy effect fallback.

Node 24 and Bun tests cover React 19.1/19.2, batching, retained setters, SSR,
StrictMode, suspended work, reducer initialization and actual Dropdown Menu 2.2.1
controlled/uncontrolled dismissal. Packed consumers check npm/Bun, CJS/ESM,
TypeScript 7 and browser builds. See [conformance](../../scripts/radix-state-conformance/README.md),
[measurements](bench/results/README.md) and [provenance](PROVENANCE.json).
