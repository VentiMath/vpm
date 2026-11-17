# vcss-color-keywords

CSS named-color data for `css-to-react-native` and styled-components, with zero
runtime dependencies. Targets css-color-keywords **1.0.0** and preserves all 146
existing name/value pairs. VentiMath's caller is the CSS converter beneath
styled-components 6.1.17; building this leaf does not switch the app's dependencies.

The 148 name/RGB facts are reconstructed from the
[CSS Color Level 3 table](https://www.w3.org/TR/css-color-3/#svg-color), with
[CSS Color Level 4's rebeccapurple](https://www.w3.org/TR/css-color-4/#named-colors).
No upstream package table or runtime is copied. Names and six-digit hex values
are lowercase. Context-dependent `transparent`, `currentColor` and system colors
are not fixed RGB named colors.

```js
import colors from 'vcss-color-keywords';
colors.royalblue; // '#4169e1'
colors.cyan;      // '#00ffff'
```

CJS, ESM, declarations and `vcss-color-keywords/index.json` are available.
The data retains conventional object lookup semantics; use own-property checks
when testing whether arbitrary input is a color name.

**Corrected gap:** upstream omits `cyan` and `magenta`. The unchanged CSS converter
rejects border and shadow shorthands using them. Both aliases now parse correctly;
all 438 comparisons using existing colors remain unchanged on Node 24 and Bun 1.4.4.
Tests also check all values, export forms, strict types and fresh/frozen packed
npm/Bun installs. [Controlled lookup measurements](bench/results/README.md) report
local data-access costs, not application speed or a need to optimize a color table.

Recorded Node/Bun lookup directions are unestablished beyond measurement noise.
This is an ownership and standards-coverage change, not a claimed speedup.
