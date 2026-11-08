# vcssjanus

Independent CSS left-to-right/right-to-left conversion, targeting **cssjanus 2.3.1** and VentiMath's installed **2.3.0**. No runtime dependencies. Supports Node 24, Bun and browser bundles.

```js
import cssjanus, { transform } from 'vcssjanus';
transform('.panel { margin-left: 12px; float: left }');
// .panel { margin-right: 12px; float: right }
```

`transform(css, options?)` preserves source formatting while reflecting physical edge properties, directional keywords, four-value shorthands, corner radii, horizontal shadows, numeric translations and background positions. Logical properties such as `margin-inline-start` retain their semantics. `/* @noflip */` and `/*! @noflip */` protect the following declaration or entire nested rule.

URL contents stay unchanged unless `transformDirInUrl` (ltr/rtl) or `transformEdgeInUrl` (left/right) is enabled. The legacy `transform(css, dirBoolean, edgeBoolean)` overload also works. CommonJS exports `{ transform }`; ESM provides the same default object and named function.

## Differences from upstream

The runtime is independently written around source spans. It does not import or embed upstream code. Compared with 2.3.1:

- Quoted `content` and escaped identifiers remain literal. Upstream can change quoted text such as `"left;right:{}"`.
- Custom-property definitions, names and references remain intact. Upstream can rename `--left` and change its stored value.
- Every shadow and background layer is reflected, including comma-separated layers; background image sizes remain unchanged. Upstream can transform only the first layer.
- Nested `@noflip` rules protect their complete contents.
- Decimal percentages preserve their precision even beyond 100 decimal places.
- Uppercase identifiers retain their casing. Invalid input types throw a clear `TypeError`.

As in upstream, this is a direction converter, not a complete CSS semantic engine or a sanitizer. It does not algebraically reflect arbitrary `calc()`/`var()` translations, matrices, rotations or SVG path data. Four-value shorthands containing functions can be reordered without evaluating them. Malformed CSS is retained where it cannot be interpreted; do not use this to validate untrusted CSS.

## Verification and adoption

The 210 upstream fixture cases and roundtrips pass. The app's 2.3.0 control intentionally excludes the six background-function fixtures added in 2.3.1. Another 3,000 seeded comparisons check both controls. Focused tests cover the corrections above.

The **unchanged stylis-plugin-rtl 2.1.1** caller is exercised with both Stylis 4.3.6 and VPM Stylis 4.4.0, in the RTL-plugin/layer-wrapper order used by VentiMath's `RootThemeProvider`. Chrome checks computed LTR/RTL styles, logical properties, literal content and layered backgrounds/shadows. These are synthetic caller-contract checks, not an authenticated application cutover.

[Conformance setup](../../scripts/cssjanus-conformance/README.md) · [controlled measurements](bench/results/README.md) · [provenance](PROVENANCE.json).

The public release uses the tag `cssjanus-2.3.1`. For VentiMath's existing transitive caller, keep its `stylis-plugin-rtl` import and pin:

```json
{
  "overrides": {
    "cssjanus": "https://github.com/VentiMath/vpm/releases/download/cssjanus-2.3.1/vcssjanus-2.3.1.tgz"
  }
}
```

This release does not replace the wrapper itself. Replacing a dependency URL is adoption work; publication alone does not establish that VentiMath uses it.
