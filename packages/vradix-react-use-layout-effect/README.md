# vradix-react-use-layout-effect

An independent replacement for `@radix-ui/react-use-layout-effect` **1.1.4** on
React 19. This is the small leaf beneath Radix callback and measurement hooks.

```js
import { useLayoutEffect } from 'vradix-react-use-layout-effect';
```

When a document exists at module load, the export is React's own layout-effect
hook. On the server it is a no-op. This preserves Radix's environment boundary,
including effect ordering and cleanup; it does not add a scheduling layer or
claim to make React's hook faster. React is the only peer, with no runtime
package dependencies. CJS, ESM and DOM-only TypeScript declarations are included.

[Checks](../../scripts/radix-layout-effect-conformance/README.md) cover browser
mount/update/unmount, Strict Mode, SSR, and the unchanged Radix callback-ref
caller. [Process-isolated measurements](bench/results/README.md) establish no
SSR speed difference on either Node 24 or Bun. The Node identical-code controls
were especially noisy; those samples remain in the report.

Built and tested; not released or adopted by VentiMath yet.
