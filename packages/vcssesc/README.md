# vcssesc

Independent, dependency-free replacement for the **cssesc 3.0.0** function API.
Escapes CSS strings and identifiers to ASCII, including Unicode code points,
quotes, backslashes and identifier prefixes.

```js
import cssesc from 'vcssesc';
cssesc('w-1/2', { isIdentifier: true });
cssesc('Practice “A”', { quotes: 'double', wrap: true });
```

Supports `isIdentifier`, `escapeEverything`, `quotes: 'single' | 'double'`, `wrap`,
mutable `cssesc.options` defaults and `cssesc.version`. Identifiers are never
quote-wrapped. The command-line wrapper is outside this package's app-used scope.

The implementation scans code points and inserts a hex terminator only when the
following emitted token needs one. Safe ASCII strings and identifiers bypass the
scanner. There is no unbounded memoization or dependency on upstream runtime code.

Two intentional corrections: a leading digit is escaped exactly once when both
identifier mode and escape-everything are enabled, and a lone hyphen becomes a
valid escaped identifier. Native Chrome selection tests verify both. Inherited
options are ignored, and non-string inputs throw TypeError. NUL and lone surrogate
serialization matches upstream; CSS itself interprets these as replacement
characters, so they cannot provide exact identifier round trips.

VentiMath's typography build plugin reaches this leaf through
postcss-selector-parser. Tests substitute it into unchanged current 7.2.1 and app
6.0.10 parser callers, covering class names, namespaces and quoted attributes.
52,128 normal-case comparisons cover all documented option combinations and
seeded Unicode inputs. The two corrections are tested separately.

CJS, ESM and strict TypeScript declarations are provided. Fresh/frozen npm and Bun
archive checks run the same caller and runtime tests plus native Chrome checks.
Runtime baseline: Node 24, Bun 1.4.4 and modern browsers. This is built, not yet
released or adopted by VentiMath.

[Benchmark evidence](bench/results/README.md) · [conformance](../../scripts/cssesc-conformance/README.md) · [provenance](PROVENANCE.json)

The isolated recorded cases take 58–84% less time on Node and 23–93% less on Bun
than upstream. These are local escaping workloads, not whole-build speed claims;
all samples and identical-code control pairs are retained in the report.
