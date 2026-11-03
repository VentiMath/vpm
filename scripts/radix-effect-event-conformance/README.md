# Radix effect-event controls

Pins effect-event 0.0.5, controllable-state 1.3.0 and Dropdown Menu 2.2.1.
The main fixture uses React/React DOM 19.1.0, matching the checked app; `current/`
pins 19.2.4 to verify actual native delegation. Install both lockfiles with npm ci.

`run.cjs upstream|vpm 19.1|19.2 client|server` runs each configuration in its own
process. The React imports are routed to the selected real renderer; no native
hook is masked or mocked. Only the effect-event import is substituted in the
unchanged Radix callers. The reducer invokes this leaf directly; Dropdown Menu's
ordinary state hook does not, so its dismissal cases are integration smoke checks.
Tests include retained callbacks, commit ordering, initial render rejection,
abandoned Suspense updates, StrictMode, optional callbacks, returns and errors.

`archives.cjs` verifies clean npm/Bun installs, CJS/ESM identity, actual mounts on
both React versions, SSR, TypeScript 7 NodeNext/Bundler DOM-only declarations and
browser bundles. CI installs both fixtures and runs package tests on Node 24/Bun.

The process-isolated benchmark uses production React. Mounted update/call cases
include synchronous React DOM commits and jsdom overhead. Retained calls exclude
rendering, so their nanosecond differences are not application performance claims.
Both versions run identical cases, with balanced process order and controls.
