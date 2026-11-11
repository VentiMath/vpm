# Desktop scrollbar checks

Pinned control: Perfect Scrollbar 1.5.6. VentiMath main
`47b9d38c77ad02722131d564ba497d16feda38a9` imports the constructor and CSS in
`src/@fuse/core/FuseScrollbars/FuseScrollbars.tsx`, subscribes to ten `ps-*` events,
sets native scroll positions, and destroys the instance in effect cleanup. Its
options expose wheel propagation and X suppression. Mobile, touch-capable and
native environments do not instantiate it.

The implementation and CSS were independently authored from public declarations,
caller evidence and black-box behavior. Upstream runtime code was not copied.
The React fixture exercises that public lifecycle with the two actual options;
it is a representative caller, not a copy of the full private app component.

```sh
npm --prefix scripts/perfect-scrollbar-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vperfect-scrollbar/test/scrollbar.test.cjs
bun test packages/vperfect-scrollbar/test/scrollbar.test.cjs
node scripts/perfect-scrollbar-conformance/run.cjs
bun scripts/perfect-scrollbar-conformance/run.cjs
node scripts/perfect-scrollbar-conformance/types.cjs
node scripts/perfect-scrollbar-conformance/browser.cjs
node scripts/perfect-scrollbar-conformance/archives.cjs
```

Node/Bun tests cover geometry bounds, validation, ownership, event deduplication,
wheel propagation, suppression, updates, destruction during events, generated IDs,
horizontal keyboard navigation and native button behavior. jsdom supplies DOM
APIs; explicit dimensions stand in for its absent layout engine. Runtime globals
are bound to that DOM for the unchanged upstream control.

Chrome compares geometry and interactions at two viewport widths using each
package's own stylesheet. Keyboard and thumb dragging use real CDP input; wheel,
rail paging, boundaries, options and effect cleanup are also checked. VPM-specific
checks cover automatic content and ancestor-direction updates, scrollbar ARIA,
RTL thumb bounds, same-origin iframe events and removal of destroyed listeners.
These are Chrome checks, not Safari/Firefox or screen-reader certification.

The archive gate installs the exact package through npm and Bun, repeats frozen
installs, and checks CJS/ESM/CSS exports, installed runtime tests, strict TS7
NodeNext/Bundler declarations and browser behavior. No runtime dependency is
resolved from an unpublished package name.

The benchmark uses the repository's isolated-process harness, balanced ordering,
identical-source controls, fixed jsdom dimensions and retained validated results.
It times construction/destruction, explicit geometry refresh and native scroll
callbacks. Browser layout/paint and touch inertia are outside the measurement.
