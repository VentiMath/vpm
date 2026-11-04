# vradix-react-popper

Independent positioning components matching **@radix-ui/react-popper 1.4.0**,
built on VPM Floating UI, Arrow and the Radix component foundations.

```jsx
import * as Popper from 'vradix-react-popper';

<Popper.Root>
  <Popper.Anchor asChild><button>Anchor</button></Popper.Anchor>
  <Popper.Content side="bottom" align="start" sideOffset={6}>
    Positioned content
    <Popper.Arrow width={18} height={8} />
  </Popper.Content>
</Popper.Root>
```

`Root`, `Anchor`, `Content` and `Arrow` also export as `Popper`, `PopperAnchor`,
`PopperContent` and `PopperArrow`. `createPopperScope` isolates nested caller
contexts. The side/alignment lists are `SIDE_OPTIONS` and `ALIGN_OPTIONS`.
React and ReactDOM 19 are peers; Node 24 and Bun run the server-side checks.

## Contract

Content uses fixed positioning. It supports side/alignment offsets, collision
padding and boundaries, flipping/shifting, partial/always stickiness, arrow
padding, clipping-based hiding, continuous animation-frame updates and `onPlaced`.
Anchor can slot onto an existing element or accept a `virtualRef` whose current
value implements `getBoundingClientRect()`. A changed virtual target is read on
the next committed render. Live geometry changes are handled by the positioning
subscriptions; `updatePositionStrategy="always"` tracks animation-frame movement.

Native props and refs pass through the VPM primitive/Slot layer. Content retains
the outer positioning wrapper and the `data-side`/`data-align` attributes. Anchor
receives `data-radix-popper-side`/`data-radix-popper-align`. The wrapper publishes
`--radix-popper-transform-origin`, `--radix-popper-available-width`,
`--radix-popper-available-height`, `--radix-popper-anchor-width` and
`--radix-popper-anchor-height`. It measures before enabling content animations.
Arrow retains its measured HTML wrapper and SVG ref.

This is the positioning layer. Opening, keyboard navigation, focus management,
roles and dismissal belong to callers such as Dropdown Menu and Popover.

## Improvements

- Eight active VPM dependencies replace the upstream runtime graph. The unused
  runtime dependencies `react-use-rect` and `rect` are omitted. The virtual
  anchor shape is declared locally, without a separate rectangle type package.
- Departing anchors release their positioning subscriptions. Content without a
  current anchor is hidden and cannot capture pointer events. Upstream retains a
  removed DOM anchor and its observers; paired tests reproduce that difference.
- Switching the update strategy replaces the subscription without remounting
  content. Upstream's optimized-to-always switch does not start frame tracking
  in the paired control.
- Middleware construction is memoized; unchanged size calculations skip CSS
  writes. Five identical native resize updates make 20 sizing writes upstream
  and zero in VPM in the controlled Chrome fixture.
- Stacking order is read from the content's owner window. Explicit `style.zIndex`
  changes refresh the positioning wrapper; upstream reads it only at attachment.

No general observer of stylesheet changes is installed for z-index. SSR has no
anchor measurements, so content remains offscreen and noninteractive until the
client has a current anchor and a position. Safari/Firefox and manual assistive
technology acceptance are not established by the Chrome checks.

## Verification and measurements

[Fixtures](../../scripts/radix-popper-conformance/README.md) cover Node 24 and Bun,
React 19.1/19.2, SSR/hydration, scoped and virtual anchors, refs, StrictMode,
subscription teardown, and the explicit upstream regression controls. Native
Chrome compares 52 rectangle/placement/transform-origin snapshots, portals,
clipping ancestors, iframe positioning, and unchanged current Dropdown Menu and
Popover caller interactions. Packed npm/Bun fresh/frozen installs check the
complete VPM closure, CJS/ESM identity and TypeScript 7 DOM-only consumers.

[Balanced isolated measurements](bench/results/README.md) retain source hashes,
identical-code controls and every sample. Synthetic jsdom positioning timings do
not establish browser paint or application latency gains. The final recording
finds unchanged parent updates 27.1% faster on Node, beyond control spread. All
other directions are unestablished at its recorded precision, including Node
resize (+4.3%) and moving-anchor (+14%) medians. Bun's parent-update median is
6.3% lower but inconclusive.

An earlier recording before adding the fixture-freshness gate found Node resize
13.1% slower and Bun parent updates 26.2% faster beyond its controls. The timed
implementation did not change between those recordings: these differences show
run-to-run noise, not a performance fix. No general positioning speedup or
regression elimination is claimed. The native CSS-write reduction is separate.


Built as an integration candidate; not yet released or adopted by VentiMath.
[Provenance](PROVENANCE.json) identifies the behavior reference and independently
written implementation. No copied upstream runtime or clean-room claim.
