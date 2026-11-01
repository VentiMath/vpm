# vreact-is

Independent, zero-dependency React element and component-type classification,
targeting **react-is 19.3.1**. Supports browser ESM/bundlers, CommonJS, Node 24+
and Bun. React itself is not loaded by this package.

```js
import {isFragment, isValidElementType, typeOf} from 'vreact-is';
isValidElementType('button'); // true
isFragment(element);
typeOf(element); // React wire-tag symbol, or undefined
```

All published symbols and predicates are supported, including context providers
and consumers, memo, forwardRef, lazy, portals and ViewTransition component
types. CJS and ESM share function identities. Classification follows React 19
wire tags; it does not turn legacy React 16–18 objects into React 19 elements.
Older callers must be upgraded alongside their React contract.

## What changes

`isValidElementType` reads a wrapper's discriminator once, giving getters one
consistent observation. Built-in predicates and `isPortal` avoid inspecting
unrelated nested metadata. Errors from fields needed by the selected predicate
still propagate. Ordinary return values, inherited-marker behavior and current
React feature symbols match the comparison package. These are marker checks,
not full validation of an object's fields.

Native ESM is available without a generated runtime wrapper. Public TypeScript
7 declarations describe boolean predicates and symbol results without importing
React or platform types; they do not provide the separate `@types/react-is`
package's React-specific narrowing types.

## Evidence

[Comparison fixtures](../../scripts/react-is-conformance/README.md) run all 14
unchanged upstream tests, compare over 800 input shapes through every predicate,
and exercise real MUI rendering and utility callers with React 19.1. Packed
npm/Bun consumers, browser bundles and CJS/ESM type checks cover public entries.

[Measurements](bench/results/README.md) use fresh processes, balanced order and
identical-source controls. Results measure classifier CPU time, not application
rendering speed. Every regression and inconclusive result is retained.

Portal rejection takes 8 versus 11 ns on Node and 7 versus 9 ns on Bun
(about 26% less paired time on each). Bun's ordinary-child fragment check takes
1 versus 2 ns (61% less). Bun host-type validation costs 6 versus 4 ns (40% more).
All other final comparisons are inconclusive under the control-spread rule,
including the Node paths that were slower in the initial implementation.

[Provenance](PROVENANCE.json) records the contract, source-informed implementation
and deliberate getter behavior. The upstream [MIT license](LICENSE) is retained;
no upstream runtime is shipped.
