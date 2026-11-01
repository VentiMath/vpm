# vhoist-non-react-statics

Copy a component's custom static properties onto its wrapper while preserving
property descriptors and excluding React's own fields. Independently implemented
against **hoist-non-react-statics 3.3.2**, with the same version number and **zero
runtime dependencies**. React memo/forward-ref tags are recognized directly;
loading a general React classifier is unnecessary for these two comparisons.

```js
import hoist from 'vhoist-non-react-statics';

function Button() {}
Button.category = 'action';
function WrappedButton() {}
hoist(WrappedButton, Button, {internalCache: true});
console.log(WrappedButton.category); // action
```

`hoist(target, source, blacklist?)` returns the same target. Symbols, accessors,
non-enumerable properties, inherited custom statics and truthy blacklist entries
are supported. String sources such as `"div"` do nothing. Existing nonconfigurable
target properties remain intact when a definition fails. A getter is copied as
a descriptor, never called to obtain its value.

## Deliberate changes

- Own custom names such as `constructor`, `toString`, `hasOwnProperty` and
  `__proto__` are copied safely with `defineProperty`. Upstream's ordinary-object
  exclusion tables accidentally suppress these names through inherited entries.
- The nearest inherited declaration wins before properties are defined. Upstream
  can lock in a nonconfigurable ancestor value and lose the child's override.
- Prototype traversal is iterative and detects proxy cycles. A 12,000-level
  fixture overflows upstream on Node; Bun's original passes that depth.
- Classification never invokes a `$$typeof` getter, and that identity field is
  never hoisted. Native `Object.prototype` and `Function.prototype` are not copied.
  A target function still inherits native methods normally. These are intentional
  differences for unusual sources, not claims of byte-for-byte output parity.

Component functions and memo/forward-ref objects are the supported inputs.
Arbitrary proxy traps may throw; errors during inspection propagate. A cyclic
prototype chain is rejected before any definitions are applied. Custom statics
retain their original value identity; this is not a deep clone. Type declarations
need neither React nor Node ambient types and conservatively exclude React-owned
fields on structurally typed exotic components.

## Evidence

All **12 unchanged original tests**, seven focused groups and Emotion 11.14.0's
actual `withTheme` caller pass on Node 24 and Bun with React 19.1.0. The caller
renders functions, memo components and forwarded refs using React DOM's server
renderer. Packed npm/Bun installs verify CJS/ESM identity, browser bundling and
TypeScript 7 NodeNext/bundler consumers.

[Benchmarks](bench/results/README.md) retain all isolated process pairs and
identical-source controls. They measure hoisting CPU work, not React render speed
or browser frame rate. [Fixture commands](../../scripts/hoist-conformance/README.md).

The runtime and declarations are independently written and source-informed.
Original tests and the BSD-3-Clause license retain attribution; this is not a
clean-room claim. [Provenance](PROVENANCE.json) · [License](LICENSE).

In this recording, the function-wrapper case takes 60% less paired time on Node
and 49% less on Bun. Node memo/descriptor cases improve 15%/14%; Bun's descriptor
case improves 10%, while its memo result is inconclusive. Resolving eight inherited
levels costs 2.87 versus 2.62 µs on Node (10% more); Bun's hierarchy result is
inconclusive. The descriptor-resolution and cycle checks are retained.
