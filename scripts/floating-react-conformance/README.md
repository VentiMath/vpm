# React interaction conformance

Pinned baseline: **@floating-ui/react 0.27.20**, React/React DOM **19.1.0**.
The lockfile pins the test tools and transitive packages. Original MIT tests are
retained from commit `12d94738472e922e1b3fa31b02b2b61b9ed77e6a`; the runner verifies
all source hashes before redirecting imports. Assertions remain unchanged.

```sh
npm --prefix scripts/floating-react-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/floating-react-conformance/run.cjs
bun scripts/floating-react-conformance/run.cjs
node scripts/floating-react-conformance/archives.cjs
node scripts/floating-react-conformance/browser.cjs
```

Both implementations pass 37 original tests (click, role, merged refs, lists and
delay groups) and nine app-shaped scenarios on Node 24 and Bun. Two scenarios
explicitly assert the original failure and VPM correction: cleanup stopping after
the first throwing ref, and loss of an existing `aria-hidden="false"` value.
Modal Tab tests use user-event's keyboard simulation. jsdom tests do not establish
browser layout or assistive-technology correctness.

Chrome runs ten mounted checks for popover focus/ARIA/Escape, modal focus guards,
menu navigation/typeahead and portal cleanup. A local debugging connection waits
for actual animation frames; it does not replace the browser's frame scheduler.
`CHROME_BIN` can select the executable. No external page or user browser profile
is used. Safari/Firefox, iframe/shadow-tree modal scopes and screen readers are
outside this verification.

Archive checks pack the package and its VPM dependencies, install them with npm
and Bun, verify CJS/ESM identity and SSR, build a browser bundle and compile the
app-shaped TypeScript 7 consumer in NodeNext and bundler modes. `prepare.cjs` links
fixture React peers into ignored package-local directories for direct benchmarks;
these links never ship. Comparison tools are not runtime dependencies.

The benchmark uses production React. SSR renders the popover/tooltip/menu hook
sets; the mounted case measures prop composition and composed handler invocation
in jsdom. Setup stays outside timing. Each worker loads only its selected
implementation. Four balanced pairs and two identical-source controls retain all
samples. These are CPU comparisons, not an application responsiveness claim.
