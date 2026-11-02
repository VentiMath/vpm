# vfloating-ui-core

Independent positioning and middleware based on **@floating-ui/core 1.8.0**,
using `vfloating-ui-utils` as its only dependency. Includes `computePosition`,
`detectOverflow`, `offset`, `flip`, `shift`, `limitShift`, `arrow`, `autoPlacement`,
`size`, `hide`, `inline` and `rectToClientRect`.

```js
import {computePosition, offset, flip, shift, limitShift} from 'vfloating-ui-core';

const position = await computePosition(reference, floating, {
  platform, // Supply measurement, clipping and other platform operations.
  placement: 'bottom-start',
  middleware: [
    offset(4),
    flip({fallbackAxisSideDirection: 'end', crossAxis: false}),
    shift({limiter: limitShift({offset: 4})}),
  ],
});
```

Core performs geometry and middleware execution; it does not read the DOM by
itself. DOM and React adapters remain separate packages. Installing this package
does not automatically redirect those callers. Browser ESM, Node 24+ and Bun
are supported, with matching CJS/ESM function identities and TypeScript declarations.

## Changes and compatibility

- Each computation captures middleware names and functions before its first await.
  Mutating the caller's array cannot append work or replace a reset callback in
  an active computation. Start a new computation to apply a changed plan.
- Adding the default overflow hook preserves inherited platform methods. Custom
  `platform.detectOverflow` implementations follow the current 1.8 API.
- Middleware names, including `__proto__`, become own data properties and cannot
  change the result dictionary's prototype. Ordinary results retain a normal
  object prototype for compatibility.
- Bounding boxes use loops rather than spreading rectangles into function
  arguments. A 150,000-rect control succeeds here and exceeds upstream's argument
  limit on Node; Bun already handles that particular upstream workload.
- Placement selection uses linear ranking with stable ties. The 50-reset cap,
  empty inline references, RTL alignment, overflow scaling and current middleware
  contracts remain supported.

This runtime is independently written after studying upstream contracts and
source. The attributed declaration contract and original tests are retained
under MIT; no upstream runtime is shipped. See [provenance](PROVENANCE.json).

## Verification

Node 24 and Bun compare 624 generated placement/middleware scenarios with core
1.8.0 and run 27 unchanged upstream tests. Controls reproduce middleware mutation,
prototype replacement and inherited-platform failures. Chrome runs 144 cases
through real DOM 1.8.0, including VentiMath's popover, tooltip and dropdown options,
plus arrows, automatic placement, size, hide and inline behavior. Shadow slots,
iframe ancestry, overflow and modal layers are checked as caller controls.
This does not certify every React interaction, browser or platform adapter.

Packed npm/Bun installs check both module formats, browser bundling and
TypeScript 7 consumers. [Measurements](bench/results/README.md) retain isolated
Node/Bun results and identical-source controls; they are CPU geometry costs,
not browser frame-rate or application latency measurements. All eight workload
comparisons are inconclusive against identical-source control variation on both
runtimes in this recording; no performance improvement is established.

```sh
npm --prefix scripts/floating-core-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vfloating-ui-core/test/core.test.cjs
bun test packages/vfloating-ui-core scripts/floating-core-conformance
node scripts/floating-core-conformance/browser.cjs
node scripts/floating-core-conformance/archives.cjs
```

Chrome is required for the browser fixture; `CHROME_BIN` can select its executable.

## Installation

Available in the public [Floating UI release](../../docs/INSTALLATION.md#floating-ui).
The React entry installs all six VPM packages from pinned release URLs. Package
versions identify upstream API baselines; application adoption is separate.
