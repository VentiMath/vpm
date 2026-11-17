# vcamelize

Independent camelize **1.0.1** replacement with no dependencies, written from its
public contract and black-box comparisons. It converts style-property strings
and recursively converts object keys. It does not copy upstream runtime code.

```js
import camelize from 'vcamelize';
camelize('background-color'); // 'backgroundColor'
camelize({ font_size: 16, label: 'literal_text' });
// { fontSize: 16, label: 'literal_text' }
```

Only own enumerable string keys participate. Arrays retain holes; nested string
values, dates, regular expressions and functions stay unchanged. Key collisions
use the last enumerable input key, matching upstream. Cycles intentionally throw
a descriptive TypeError rather than overflowing the stack. This is a key
converter, not a general serializer for Maps, Sets or custom classes.

VentiMath installs this leaf through styled-components and css-to-react-native
3.2.0. Current styled-components 6.6.0 still uses that converter. The unchanged
converter is tested with the replacement on Node 24 and Bun 1.4.4; application
adoption and a public release have not happened yet. The earlier `shallowequal`
dependency is absent from current styled-components, so it was not rebuilt.

Eight focused tests, 8,014 differential inputs and 16 converter calls cover the
contract, plus strict TypeScript 7 and fresh/frozen npm/Bun archive consumers.
Types avoid pretending that the original object property names survive renaming.
[Measurements](bench/results/README.md) use isolated processes with balanced
ordering and same-implementation controls; they do not measure app performance.

The three CSS-name fixtures take about 61–63% less time on Node and 49–64% less
on Bun. Nested object conversion takes 30% less time on Bun. Node's nested-object
median is 9% higher, but overlaps the control spread; no direction is established
at this precision. The actual CSS converter calls the string path.
