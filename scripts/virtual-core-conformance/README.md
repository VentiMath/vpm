# Virtual-core conformance

Pinned controls: current @tanstack/virtual-core 3.19.11 and app-pinned 3.11.2.
The fixture retains unchanged public Material React Table 3.2.1 row/column hooks
and helpers with their MIT license, plus the original React 3.11.2 adapter as a
test consumer. None of those implementations ships in the VPM runtime.

`run.cjs` compares geometry, overscan, offsets, keyed sizes, repeated resizes and
current snapshots across 400 seeded scenarios. Comparisons to 3.11.2 exclude
out-of-bounds viewport clamping, an intentional upgrade to current behavior.
The package tests cover frozen options, invalid layouts, snapshots, callbacks
arriving after teardown, frame cancellation, remounts and scroll-reset timers.

Native Chrome executes the unchanged hooks with both controls and VPM in the
main document and an iframe. Checks include row/column scrolling, focused DOM
identity, pinned and dragged items, live row resizing, index alignment, detail
panels, density/filter changes, owner-window observer cleanup and window scrolling.
The shared old/current table comparisons hide scrollbar gutters to isolate the
legacy observer difference consistently across operating systems. A separate
native-scrollbar/border fixture compares the reported viewport with actual
client dimensions. Current client viewport sizing is compared separately from the older border-box
behavior. The detail-panel fixture also records a 15px total-height difference
from the old control, with identical visible rows and scroll position; VPM
matches current behavior throughout. These are real library callers with synthetic table data, not an
authenticated application acceptance test.

`archives.cjs` verifies fresh/frozen npm and Bun installs under the upstream
alias, with the existing React adapter resolving the packed core through an
override. Packed bytes, CJS/ESM, Node/Bun, TS7 NodeNext/Bundler, React adapter
public declarations and native Chrome caller behavior are checked.

```sh
npm --prefix scripts/virtual-core-conformance ci --ignore-scripts
bun scripts/virtual-core-conformance/build.cjs
node scripts/virtual-core-conformance/archives.cjs
```
