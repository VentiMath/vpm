# vcss-to-react-native

Independent replacement for **css-to-react-native 3.2.0**. Converts ordered CSS declaration tuples into React Native style objects. All three runtime helpers are VPM packages: `vcamelize`, `vcss-color-keywords` and `vpostcss-value-parser`. Node 24 and Bun 1.4.4; CommonJS, ESM and declarations included.

```js
import convert from 'vcss-to-react-native';
convert([['margin', '4px 8px'], ['border', '1px solid cyan']]);
// { marginTop: 4, marginRight: 8, marginBottom: 4, marginLeft: 8,
//   borderWidth: 1, borderColor: 'cyan', borderStyle: 'solid' }
```

Exports the default converter, `getPropertyName`, `getStylesForProperty` and the upstream-compatible
`transformRawValue(name, value)` helper. Declaration order and shorthand blacklisting are preserved. Supports 3.2.0's box, border, font, flex, shadow, transform, aspect-ratio and text-decoration shorthands. Unsupported ordinary properties retain generic number/boolean/null/string conversion. The raw helper converts scalar numbers/pixel lengths, booleans, null and undefined;
it preserves surrounding whitespace and does not expand shorthands. Malformed
numbers such as `2.` and `1.e3` remain strings. Font weights remain strings. Relative lengths remain strings; this package does not resolve them against a layout. It does not parse whole stylesheets or implement a browser cascade.

Changes from 3.2.0:

- Recognizes cyan/magenta and case-insensitive named colors, ignores CSS comments in shorthand values, and accepts `transform: none`.
- Does not silently discard extra tokens in `background` or `font-weight`. Mixed `none` and decoration lines, and unclosed function values, are rejected with declaration context.
- Prototype names cannot masquerade as colors; output properties are defined as own data without invoking inherited setters. Repeated calls return independent objects.
- Explicit single relative-unit shadow offsets expand to both dimensions, like pixel offsets. `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `gray` and `color` functions pass through color-bearing shorthands. Their arguments remain opaque, as in upstream; acceptance does not certify valid CSS or React Native support.

269 unchanged upstream tests and deterministic compatibility cases run on Node and Bun. The unchanged styled-components 6.1.17 native entry is exercised against the converter with only its native view boundary stubbed. VentiMath's recorded browser caller uses `StyleSheetManager` in iframe documentation demos, **not** React Native conversion; completing this installed dependency is not a claim of changed browser behavior or app adoption.

Runtime code was independently written; only test fixtures retain upstream code and attribution. See [provenance](PROVENANCE.json), [verification](../../scripts/css-native-conformance/README.md), [benchmarks](bench/results/README.md) and [installation](../../docs/INSTALLATION.md).

The recorded composite native style takes about 5.3 µs versus 4.0 µs on Node (5.5 µs versus 5.3 µs on Bun). Other comparisons vary with process order and the heavily loaded host; no general speed advantage is claimed. The isolated-process reports retain all samples and same-code controls.
