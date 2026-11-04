# Radix React Primitive conformance

Pins **@radix-ui/react-primitive 2.2.0**, checked November 2, 2026, and the app's
**2.1.3** baseline. React 19.2.4, Radix Toggle 1.1.10, Testing Library, jsdom and
React declarations are test-only. The lockfile pins archives;
[provenance](../../packages/vradix-react-primitive/PROVENANCE.json) records hashes.

`run.cjs` checks every public tag's native and `asChild` output against current and
legacy references, plus aliases, display names, immutable input props, SSR and
dispatch return/error behavior. Paired instrumentation demonstrates upstream's
17 eagerly created Slot wrappers and VPM's per-tag lazy initialization, and checks
that ReactDOM is deferred until dispatch. These controls inspect actual factory
calls rather than assuming a particular startup timing.

`callers.cjs` replaces only the Primitive import in an unchanged Toggle 1.1.10
module. Both implementations run native and slotted toggles, controlled state,
disabled/prevented clicks, hydration, and StrictMode ref cleanup. A native custom
event first demonstrates React's deferred update; the dispatch helper then must
commit the state change before returning inside the same `act` callback.

`archives.cjs` packs Primitive, Slot and ref composition and installs the exact
closure through npm and Bun. Bun explicitly overrides unpublished dependencies
to their local archives. Both runtimes check CJS/ESM, native/slotted SSR and event
dispatch; TypeScript 7 checks native HTML/SVG refs, props and custom-event types
with NodeNext/Bundler and no Node ambient types. Browser bundling rejects Node
built-in imports. Public release URLs must be pinned when the closure is released;
no application dependency is changed here.

```sh
npm --prefix scripts/radix-react-primitive-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-primitive/test/primitive.test.cjs
bun test packages/vradix-react-primitive/test/primitive.test.cjs
node scripts/radix-react-primitive-conformance/archives.cjs
```

[Benchmarks](../../packages/vradix-react-primitive/bench/results/README.md) retain
all samples, balanced process order and identical-code controls. The initialization
case recompiles neither implementation inside timing; it compares module factories
with warm dependencies. SSR uses the development renderer and the corresponding
complete Slot/ref dependency stack, not a stubbed React implementation.

The archive check also executes a production browser bundle in an isolated JS
context and renders a slotted SVG. This catches broken React imports that a
build-only check misses; both fresh npm and Bun installs run the assertion.
