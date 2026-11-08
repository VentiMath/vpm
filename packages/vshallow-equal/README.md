# vshallow-equal

Independently written shallow comparisons targeting **shallow-equal 3.1.0**,
with `/arrays` and `/objects` entry points for the application's 1.2.1 callers.
Zero dependencies; CommonJS, native ESM and TypeScript declarations.

```js
import {shallowEqual, shallowEqualArrays, shallowEqualObjects} from 'vshallow-equal';
import arrays from 'vshallow-equal/arrays';
```

Array indices and own enumerable string-keyed object properties use `===`:
NaN differs from NaN, signed zero compares equal, and nested objects require
reference identity. Symbols and nonenumerable properties remain excluded;
sparse array slots compare like undefined. The generic function distinguishes
arrays from objects. These are shallow comparisons, not recursive equality.

Unlike upstream, distinct scalar inputs cannot silently compare equal, and the
array helper checks input kinds before comparing distinct values. Object comparison checks ownership **before**
reading either value, so a missing own key cannot trigger an inherited getter.
Own getters still execute when their values are actually compared.

All 31 original tests run unchanged on Node 24/Bun. Five focused groups and six
real React Autosuggest lifecycle transitions plus SSR verify behavior against
1.2.1, 3.1.0 and VPM. This is dependency-level verification; the application has
not adopted the replacement. Packed npm/Bun CJS/ESM/browser/TypeScript 7 consumers
are also checked. [Evidence](../../scripts/shallow-equal-conformance/README.md),
[measurements](bench/results/README.md), [provenance](PROVENANCE.json).

MIT; original test attribution is retained.


The [Autosuggest release installation recipe](../../docs/INSTALLATION.md#navigation-autosuggest)
provides this package in the `autosuggest-10.1.0` set with pinned internal URLs.
Release availability and application adoption are separate milestones.
