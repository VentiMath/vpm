# vfloating-ui-utils

Independent, dependency-free placement and DOM helpers based on
**@floating-ui/utils 0.2.12**. Provides the root and `/dom` APIs used underneath
Floating UI positioning, including VentiMath's Tiptap popovers, menus and tooltips.

```js
import {getOppositeAxisPlacements} from 'vfloating-ui-utils';
import {getOverflowAncestors} from 'vfloating-ui-utils/dom';

getOppositeAxisPlacements('top-start', true, 'start');
getOverflowAncestors(document.querySelector('button'));
```

Native browser ESM and CommonJS expose the same functions. Node consumers require
Node 24+; Bun is also tested. DOM operations require a browser or DOM host. Type
consumers of `/dom` need TypeScript's DOM library; no Node or React declarations
are installed. Installing this package does not redirect existing callers.

## Changes and compatibility

- Every fallback placement array belongs to its caller. Mutating an unaligned
  result cannot alter later placements, unlike the upstream shared arrays.
- Ancestor walks use iteration and append to one result array. They preserve
  overflow ordering, shadow slots, body/viewport handling and iframe traversal.
  A 20,000-node nearest-ancestor control exceeds upstream's stack on Node; Bun
  already optimizes that upstream tail call.
- Type checks use the node's realm when global DOM constructors are absent.
  Server-side predicates still return false without a global `window`.
- `isWebKit()` returns a boolean even if a host has no CSS feature API.
- Current 0.2.12 padding behavior is retained: only four sides are returned,
  nullish values become zero, and inherited side values remain supported.

The runtime is independently written after inspecting the API and source.
Declarations and retained tests are attributed to Floating UI under MIT. See
[provenance](PROVENANCE.json). This is not a clean-room implementation.

## Verification and measurements

Tests compare all placement helpers, RTL, geometry, numeric boundaries, DOM realms,
shadow slots, iframe ancestry, mutation isolation and deep traversal. Twenty-one
unchanged upstream tests run with import redirection and JSDOM. Chrome compares
24 actual core 1.7.5/dom 1.7.6 positioning cases with `offset`, `flip`, `shift` and
`arrow`, plus overflow, shadow, iframe and modal checks. This is selected browser
coverage, not certification of every Floating UI React interaction or browser.

Packed npm/Bun installations exercise CJS, ESM, browser bundling and TypeScript 7.
[Measurements](bench/results/README.md) use isolated processes and identical-source
controls. They measure helper CPU cost on Node/Bun, not browser frame rates.
The recorded Node run establishes lower time for RTL alignment sides (41%) and
unaligned fallback placements (62%). Expanded placement lists cost 40 ns more
on Node and 34 ns more on Bun (20%/24% paired changes); Bun alignment extraction
costs 8 ns more (34%). Other directions are inconclusive against controls.
These are small helper costs, not measured application regressions.

```sh
npm --prefix scripts/floating-utils-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vfloating-ui-utils/test/utils.test.cjs
bun test packages/vfloating-ui-utils/test/utils.test.cjs
node scripts/floating-utils-conformance/browser.cjs
node scripts/floating-utils-conformance/archives.cjs
```

The browser check requires Chrome; set `CHROME_BIN` for a nonstandard installation.
