# vstylis-plugin-rtl

Independent **stylis-plugin-rtl 2.1.1** middleware for the Stylis 4 node contract, including VentiMath's `RootThemeProvider`. Node 24, Bun and browser bundles. One dependency: `vcssjanus`; it does not load another Stylis engine.

```js
import rtl from 'vstylis-plugin-rtl';
import { compile, serialize, middleware, stringify } from 'vstylis';
serialize(compile('.panel { margin-left: 12px }'), middleware([rtl, stringify]));
// .panel{margin-right:12px;}
```

Keep RTL before the app's layer-wrapping middleware. If adding vendor prefixes, put RTL before the prefixer so whole-rule ignore annotations are available before it generates copies. Ordinary prefixer-before-RTL behavior remains covered by the unchanged upstream tests.

The plugin changes declaration fields in place and retains AST identity, positions and parent links. It avoids upstream's serialize/transform/reparse round trip. Weak bookkeeping ensures declarations are reflected once, including shared prefixer copies and repeated serialization. Compile a fresh tree when changing the source CSS; editing an already-processed declaration does not reset its RTL state.

## Correctness differences

- Nested rules still flip after `RootThemeProvider` changes their parent into `@layer`. Upstream can miss these rules.
- Declarations inside `@layer`, `@container` and `@scope` are supported alongside media/supports/keyframe rules.
- `/* @noflip */` and `/*! @noflip */` bind in source order, including nested rules lifted into sibling arrays by Stylis. Ignoring a whole rule protects its descendants.
- The [CSSJanus corrections](../vcssjanus/README.md) preserve quoted content and custom properties, and correctly reflect multiple shadows/background layers.

The public export is an ES module default function. CommonJS supports both `require('vstylis-plugin-rtl')` and `.default`; the function retains the stable `stylisRTLPlugin` name.

## Verification

All nine unchanged upstream tests run with original and VPM middleware on both Stylis engines. Another 4,800 seeded pipeline comparisons cover current/app CSSJanus controls, prefixes and the app's layer order; 1,600 cases explicitly assert the corrected nested-layer output. Focused tests cover source-order annotations, modern at-rules, identity and repeated serialization. Native Chrome verifies computed styles and the upstream nested-layer failure. [Conformance setup](../../scripts/rtl-conformance/README.md) · [controlled benchmarks](bench/results/README.md).

These are synthetic theme-caller checks, not an authenticated application cutover. VentiMath adoption is separate from building and publishing the package.
