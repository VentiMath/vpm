# Radix ID controls

Pins react-id 1.1.4 and Dropdown Menu 2.2.1 with React/React DOM 19.1.0;
`current/` pins 19.2.4. Install both fixtures. Tests use actual React renderers,
not mocked hooks. Unchanged Radix callers receive only the ID substitution.

`run.cjs upstream|vpm 19.1|19.2 client|server` verifies native SSR IDs and escaping,
StrictMode, override changes, remounts, distinct roots, hydration without recovery,
and Dropdown trigger/content ARIA links and dismissal. `archives.cjs` verifies
clean npm/Bun installs, both module systems, TypeScript 7 DOM-only declarations
and browser bundles. CI runs contracts on Node 24/Bun and checks the archives.

Benchmarks use production React in separate processes, balanced order and
identical-source controls. SSR measures a small 32-ID subtree; mounted cases
include real synchronous React DOM commits in jsdom. No browser-layout or
application-throughput claim follows from these timings.
