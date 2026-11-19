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
values, dates, regular expressions and functions stay unchanged, including Date
and RegExp instances from another realm. Custom `Symbol.toStringTag` properties
cannot make ordinary objects bypass key conversion. Key collisions
use the last enumerable input key, matching upstream. Cycles intentionally throw
a descriptive TypeError rather than overflowing the stack. This is a key
converter, not a general serializer for Maps, Sets or custom classes.

VentiMath formerly installed this leaf through styled-components and
css-to-react-native 3.2.0; app main `211e2186` removes that chain and its override. Current styled-components 6.6.0 still uses that converter. The unchanged
converter is tested with the replacement on Node 24 and Bun 1.4.4. The
[camelize-1.0.1-r2 release](https://github.com/VentiMath/vpm/releases/tag/camelize-1.0.1-r2)
is available as an immutable archive; the original archive was adopted at app main `a7ce009f`. The earlier `shallowequal`
dependency is absent from current styled-components, so it was not rebuilt.

Ten focused tests, 8,014 differential inputs and 16 converter calls cover the
contract, plus strict TypeScript 7 and fresh/frozen npm/Bun archive consumers.
Types avoid pretending that the original object property names survive renaming.
[Measurements](bench/results/README.md) use isolated processes with balanced
ordering and same-implementation controls; they do not measure app performance.

The CSS-name fixtures remain faster than upstream on both Node and Bun; the
actual CSS converter calls this unchanged string path. Nested-object conversion
has a Node regression relative to upstream, retained explicitly in the linked
measurements. Each recording includes the control spread and source hashes.

Keep the original `camelize` import name and apply the release's
`consumer-package.json` override. [Installation](../../docs/INSTALLATION.md#camelize)
includes the exact URL and archive verification commands.

## Cross-realm correction

The published `camelize-1.0.1` archive used realm-local `instanceof` checks and
converted foreign Date/RegExp values to ordinary objects. The source now
preserves their identity at the root and inside objects/arrays, including
invalid dates and custom type tags. The correction is packaged as `camelize-1.0.1-r2`; the original archive is
unchanged. Repin its override to the r2 URL to consume the fix. VentiMath's former
css-to-react-native dependency supplied strings and was unaffected by this defect.
Its later removal was unrelated to a package bug.
