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
wheel propagation, suppression, updates, reentrant updates and nested scrolling, destruction during events, generated IDs,
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

The fixed-layout DOM fixture restores the original global property descriptors
when it closes, including overlapping fixtures closed out of order. This keeps
Bun's shared-process suite from leaking a browser document or Event constructor
into later native-event and server-rendering tests. The regression lives in
`scripts/test/perfect-scrollbar-fixture.test.cjs`.

## Mobile fallback in FuseScrollbars

VentiMath revision `aa110e55` has one caller of mobile-detect 1.4.5. FuseScrollbars reads the truth value of `mobile()` once when the module loads. A positive result, a touch signal, or a native Capacitor shell selects native scrolling. Only a browser that satisfies none of these checks can initialize Perfect Scrollbar.

| Example input | Other signal | Result | Requires the UA check |
| --- | --- | --- | --- |
| Desktop Chrome | None | Custom scrollbar eligible | Yes, to establish a negative result |
| Desktop-style iPad UA | Positive touch-point count | Native scrolling | No |
| Desktop UA in a native shell | Capacitor native | Native scrolling | No |
| Android tablet UA | No touch or native signal reported | Native scrolling | Yes |
| Opera Mini or Alcatel feature-phone UA | No touch or native signal reported | Native scrolling | Yes |

**Keep the 1.4.5 UA fallback.** Checking touch and Capacitor first preserves the decision and avoids constructing the detector when either already selects native scrolling. The fixture exercises that change in isolation. VentiMath’s current code still evaluates the detector first.

The pinned upstream corpus contains 1,603 records and 1,590 distinct UA strings. For each string, the test toggles touch-event support, a positive touch-point count, and the native-shell result independently. All 12,720 decisions matched the app’s original predicate on Node 24 and Bun 1.4.4. With every capability absent, the detector selected native scrolling for 1,523 distinct UAs. A comparison regex covering Android, iOS, Mobile, Silk, Kindle, BlackBerry and Opera Mini missed 72 of them. These are synthetic capability combinations over upstream fixtures. They do not estimate prevalence among VentiMath users. [Pinned UA corpus](https://github.com/hgoebl/mobile-detect.js/blob/2e1697b506cd13bc36906f8437f7a8327010f373/tests/data/user-agents.js)

In a batch containing one touch phone, one native shell, one desktop browser and one UA-only mobile client, checking capabilities first took 55% less time on Node and 54% less on Bun. In the fallback-only batch the difference was within measurement noise. These timings measure the decision after importing the detector. [Node samples](mobile-bench/node24.json) · [Bun samples](mobile-bench/bun.json)

Run `node scripts/perfect-scrollbar-conformance/mobile-check.cjs` for the fixed profiles. For the full comparison, pass the downloaded upstream `user-agents.js`, a VentiMath checkout and its Git revision as three additional arguments. The script verifies the corpus checksum and reads the actual gate from that revision.
