# vradix-react-use-callback-ref

Independent implementation of **@radix-ui/react-use-callback-ref 1.1.5** for React
19. A component keeps one callable while its target changes. Insertion effects
publish the latest committed target before layout effects; an abandoned render
cannot replace the committed target. An absent callback returns `undefined`.
Return values, promises, arguments and thrown values pass through unchanged.

```js
import {useCallbackRef} from 'vradix-react-use-callback-ref';
const stableOnChange = useCallbackRef(onChange);
```

React is the only peer dependency. React 19 guarantees insertion effects, so this
package does not need upstream's legacy layout-effect fallback dependency.
React 18 and older runtimes are outside this package's contract.

Current upstream and VPM controls cover browser mounting, StrictMode, target
updates, layout timing, suspended render isolation, the unchanged Radix
RovingFocus caller and server rendering on Node
24 and Bun. Fresh npm/Bun archives check CJS/ESM identity, TypeScript 7 DOM-only
consumers and browser bundling. [Provenance](PROVENANCE.json) records inspected
sources and attribution; this is not a clean-room claim.

[Measurements](bench/results/README.md) time a server-rendered hook consumer;
they do not establish browser-event or application speedups. This package is
built but has not been released or adopted by VentiMath.
