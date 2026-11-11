# vgoober

Independent object styles for VentiMath notifications, targeting **Goober 2.1.19**
and the **2.1.18** version installed beneath Notistack 3.0.2.

```js
import { css, extractCss } from 'vgoober';
const className = css({
  color: '#fff',
  backgroundColor: '#43a047',
  '&:hover': { opacity: 0.9 },
  '@media (min-width:600px)': { minWidth: '288px' },
});
```

Notistack calls `css(object)` for all 20 of its style definitions. This package
implements that complete caller contract with zero runtime dependencies. Numeric
values are emitted without adding units. Own declarations, nested selectors,
`&`, selector lists and conditional `@media`, `@supports`, `@container` and `@layer`
rules are supported. Object arrays merge in order; inputs are never mutated.

`css.bind({target})` scopes insertion to an element, document head, shadow root or
an SSR object `{data: ''}`. The default is the current document head or an internal
server target. For separate server requests, use separate explicit targets.
`extractCss(target?)` returns and clears that target's CSS. Subsequent calls insert
again. A target's owner document supplies its elements and CSP nonce (`__nonce__`).
Removing a style element does not permanently disable later style insertion.

Generated classes are content-derived and **differ from Goober's names**. Browser
styles use `_vgoober`; server CSS can hydrate into a style element with that ID.
Switch server and client together; this is not a cross-engine hydration adapter.
Input changes are observed on every call. Shared compiled content is bounded to
128 entries; each stylesheet retains the rules and names it actually needs.

Invalid numbers, cyclic/excessively deep styles, unsafe property keys and malformed
selectors reject before insertion. Inherited properties are ignored, null/false
values are omitted, and `msUserSelect` becomes `-ms-user-select`. Property fallback
arrays reject explicitly instead of becoming numeric nested selectors. CSS is an
authoring API, not an untrusted-content sanitizer.

## Scope and verification

There is no `styled`/`setup` API, raw/template CSS compiler, keyframes/global helper,
prefixer plugin or Babel integration. These are not used by Notistack and are not
silently supplied by upstream code. This is not a general replacement for every
Goober consumer.

The [conformance fixture](../../scripts/goober-conformance/README.md) checks 240
serialized results against current/app controls and imports unchanged Notistack
with only Goober substituted. Chrome compares all five notification variants at
six anchors, two densities and two widths, plus iframe/shadow targets, nonce,
hydration and removed-sheet recovery. 14 focused tests on Node 24 and Bun 1.4.4, strict TS7 declarations
and fresh packed installs are checked separately.

[Benchmarks](bench/results/README.md) use isolated processes, balanced order and
identical-source controls. The final Bun recording puts repeated responsive styles
8.6% below upstream; flat-style differences are unestablished. The complete 20-style
SSR extraction workload costs 20.25 versus 9.76 μs on Node and 11.09 versus 9.01 μs
on Bun. A cycling 1,000-style working set exceeds VPM's 128-entry compilation cache
and is substantially slower than upstream's retained cache (1.89 versus 0.24 μs on
Node; 0.90 versus 0.28 μs on Bun). Input validation and bounded retention are
preserved. No overall performance win is claimed. Publication and VentiMath
adoption remain separate.
