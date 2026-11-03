# Radix primitive comparisons

Pinned @radix-ui/primitive **1.2.0**, the app's **1.1.3**, and React Toggle **1.1.10**
are controls only; VPM's runtime is independently written. The locked fixture
contains the upstream distribution and licenses without copying it into VPM.

`run.cjs` checks 48 event-handler combinations per implementation, callback order,
return values, prevention and errors. Current 1.2.0/VPM also exercise iframe
ownership, active focus and aria-activedescendant. A paired control records the
intentional correction for a secondary Document input. `caller.cjs` privately
substitutes only the primitive import in the unchanged Toggle component and
checks real React toggles and user prevention on React 19.2.4 with jsdom.

```sh
npm --prefix scripts/radix-primitive-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-primitive/test/*.test.cjs
bun test packages/vradix-primitive/test
node scripts/radix-primitive-conformance/archives.cjs
```

The archive check installs with npm and Bun, executes both runtimes, verifies
CJS/ESM identity and development conditions, compiles DOM-only TypeScript 7
NodeNext/Bundler consumers and bundles for browsers. jsdom checks are not a
claim about browser layout, assistive technology or every Radix component.

The [paired benchmarks](../../packages/vradix-primitive/bench/results/README.md)
use separate processes and identical-source controls, with no sample trimming.
