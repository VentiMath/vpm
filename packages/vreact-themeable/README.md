# vreact-themeable

Independent theme-to-props helper targeting **react-themeable 1.1.0**, the current
release and VentiMath’s react-autosuggest dependency. Zero runtime dependencies:
native object spread replaces the legacy object-assign package. App adoption is
separate; this helper does not implement an autocomplete widget or a styling engine.

```js
import themeable from 'vreact-themeable';
const classes = themeable({ input: 'Input', active: 'Active' });
classes('search', 'input', 'active');
// { key: 'search', className: 'Input Active' }

const styles = themeable({ base: { color: 'red' }, active: { color: 'blue' } });
styles('search', 'base', 'active');
// { key: 'search', style: { color: 'blue' } }
```

CommonJS `require` returns the same factory. TypeScript declarations are included
without requiring React, DOM or Node declarations. Annotate the parameter type
for an inline custom decorator (for example `(...styles: MyStyle[]) => string`)
so TypeScript can check its inputs against the theme map.

## Behavior

The factory retains a reference to the theme map. Each call looks up its requested
names once, in order, then discards falsy **values**. Names themselves are not
filtered: a theme may intentionally define entries named `false`, `0` or the empty
string. Inherited map entries remain supported. Later map changes are visible.

If the first resolved value is a string, the selected values are space-joined
into `className`, retaining order and duplicates. Otherwise they are shallowly
merged into a fresh `style` object, with later values winning. Empty selections
return an empty style object. Mixed class/style maps follow that first-selected
value rule, including upstream’s JavaScript string/object coercions.

`themeable([map, decorator])` calls the decorator with the original selected values
as separate arguments, with `this === null`, and returns its result as `className`.
The decorator is also called for an empty selection. The caller’s key is returned
unchanged, including numbers, symbols and undefined; React handles its own key
conversion when the result is spread into an element.

## Assignment semantics and deliberate changes

Style copies preserve own enumerable string **and symbol** properties, getter
order and one read per source property, later-wins overwrites, and nested object
identity. Non-enumerable/inherited style properties are omitted. Source descriptors
become ordinary writable data properties, and sources are not mutated. Keys are
captured before reading values, so properties added by a getter are not included
in that copy. On the verified modern runtimes, upstream’s shim already delegates
to native `Object.assign`; dependency removal alone is not a speed claim.

A source `__proto__` property becomes an own data property while the result keeps
`Object.prototype`. Upstream’s assignment invokes the inherited setter and changes
the result’s prototype instead. This is a deliberate correction; no claim is made
that the old behavior modifies the global Object prototype. New objects are used
for each merge, so no caller-owned setters are invoked on a target.

Themes must be objects; decorated themes must include a function. Invalid factory
arguments throw `TypeError` immediately. Getter/decorator errors propagate. This
is shallow composition, not CSS validation, deep merging or sanitization.

## Verification and measurements

All nine unchanged upstream tests, 6,000 differential cases, property-copy controls,
24 actual autosuggest render snapshots and nine Chrome class/style/decorator
comparisons pass on the recorded controls. Chrome also verifies computed styles,
input identity and focus across rerenders. Both actual FuseSearch theme maps match
through 12 synthetic autosuggest render cases. No authenticated app run is claimed.

[Conformance](../../scripts/themeable-conformance/README.md) covers Node 24/Bun,
exact archives, fresh/frozen npm/Bun installs, CJS/ESM and TypeScript 7.
[Measurements](bench/results/README.md) retain all isolated process/control samples.


The [Autosuggest release installation recipe](../../docs/INSTALLATION.md#navigation-autosuggest)
provides this package in the `autosuggest-10.1.0` set with pinned internal URLs.
Release availability and application adoption are separate milestones.
