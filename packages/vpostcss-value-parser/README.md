# vpostcss-value-parser

Independent replacement for **postcss-value-parser 4.2.0**, with no runtime dependencies. Parses CSS values into mutable tokens with source offsets, preserves formatting, walks nested functions and splits dimensions into number/unit pairs. Node 24 and Bun 1.4.4; CommonJS, ESM and declarations are included.

```js
import parse from 'vpostcss-value-parser';
const value = parse('translate(2px, 3px)');
value.walk(node => { if (node.type === 'word') console.log(node.value); });
value.toString(); // translate(2px, 3px)
parse.unit('1.5rem'); // { number: '1.5', unit: 'rem' }
```

The callable/constructable parser, `nodes`, chainable `walk`, `toString`, static `walk`, `stringify` (including custom serialization) and `unit` follow the public 4.2.0 API. Walking is preorder unless `bubble=true`; returning false skips descendants in preorder. Strings and URLs preserve escapes. This is a lexer, not a CSS validator.

Parsing, walking and serialization use explicit stacks: 20,000 nested functions do not exhaust the JavaScript stack. Unchanged upstream tests pass. Intentional recovery differences: offsets never exceed input length; `/*/` is an unclosed comment and round-trips without losing a slash; divider whitespace is consistently attached to `/`, including after a closed function. The comparison fixture identifies these differences explicitly instead of weakening all token assertions.

The runtime was written independently from the documented API and behavioral tests. Upstream code exists only in pinned comparison/test fixtures. See [provenance](PROVENANCE.json), [checks](../../scripts/css-native-conformance/README.md) and [measurements](bench/results/README.md).
