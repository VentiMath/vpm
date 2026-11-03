# vradix-primitive

Independent, dependency-free helpers matching **@radix-ui/primitive 1.2.0**:
`composeEventHandlers`, DOM ownership/focus helpers and the conditional
`is-development` entry. The application’s 1.1.3 event-composition callers are
also checked. No React dependency or upstream runtime is shipped.

```js
import {composeEventHandlers} from 'vradix-primitive';
const onClick = composeEventHandlers(userOnClick, internalOnClick);
```

The first handler runs synchronously. The second runs unless default was
prevented; `{checkForDefaultPrevented: false}` bypasses that check. Exceptions
propagate, and the second handler's return value is preserved at runtime.
`canUseDOM` captures capability at import time. Ownership helpers throw on the
server. The `IS_DEVELOPMENT` export is true under the `development` condition,
false under `production` or the default condition.

Unlike upstream, passing a secondary `Document` directly resolves that document
and its window instead of the global document. Focus traversal uses an iterative
loop through accessible iframes, preserves an inaccessible iframe as the focused
element, and optionally resolves `aria-activedescendant`. It does not claim
shadow-root focus traversal. Timer types compile without ambient Node types.

[Comparison fixtures](../../scripts/radix-primitive-conformance/README.md) cover
current/app-version event behavior, DOM helpers, an unchanged Radix Toggle caller,
SSR, conditional exports, clean archives, browser bundling and TypeScript 7.
[Isolated measurements](bench/results/README.md) retain all samples and controls;
these tiny helper timings do not measure rendering or application responsiveness.

This package is built but not released or adopted. [PROVENANCE.json](PROVENANCE.json)
records the reference version and independently written implementation. Upstream
MIT attribution is retained; this is not a clean-room claim.

The recorded creation benchmark takes 194→12 ns on Node and 85→18 ns on Bun,
with lower time in every process pair beyond control spread. The independent
wrapper does not redefine the generated function's name on each creation.
Both dispatch cases remain inconclusive on both runtimes; no faster-click or
rendering claim follows from these microbenchmarks.
