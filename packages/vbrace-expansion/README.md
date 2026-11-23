# vbrace-expansion

Independent brace expansion for VentiMath's file and build patterns, targeting
brace-expansion 5.0.13. Its only runtime dependency is VPM's vbalanced-match.

```js
import { expand } from 'vbrace-expansion';
expand('{src,functions}/**/*.{ts,tsx}');
// ['src/**/*.ts', 'src/**/*.tsx', 'functions/**/*.ts', 'functions/**/*.tsx']
expand('case-{001..005..2}.json');
// ['case-001.json', 'case-003.json', 'case-005.json']
```

Nested alternatives, numeric/alphabetic ranges, reverse and zero steps, padding,
escaped punctuation, `${…}` literals and malformed-brace compatibility are
covered. Output order and duplicates are preserved. Named CJS/ESM exports
match the current API; a callable CommonJS export and ESM default also support
older minimatch callers.

## Bounded expansion

The current options and exported constants use these defaults:

| Option | Default | Purpose |
| --- | ---: | --- |
| `max` | 100,000 | Maximum kept results per accumulator |
| `maxLength` | 4,000,000 | Maximum combined UTF-16 length per accumulator |
| `maxDepth` | 1,000 | Maximum child-expansion depth |
| `maxRewrites` | 1,000 | Maximum malformed-brace rewrites per frame |
| `maxSteps` | 20,000,000 | Work budget across the call |

`Infinity` lifts the corresponding bound; omitted or NaN values use defaults.
No JavaScript recursion is used: child expansions run on an explicit stack.
Output budgets are checked before building products. A same-width escape mask
keeps user NUL and private-use characters intact without random placeholders.

Deliberate differences from upstream:

- Work accounting belongs to this implementation. Scans, frame starts, range
  values and generated characters consume it. Exhaustion preserves the remaining
  expression literally, subject to output caps; the exact stopping point need
  not match upstream's internal operation counter.
- Output lengths count decoded UTF-16 characters, including escaped punctuation,
  rather than temporary placeholder lengths.
- Patterns must be strings and option values must be numbers. Negative bounds
  clamp to zero; fractional bounds round down.
- Integer endpoints or steps outside the safe-number range remain literal,
  avoiding rounded or non-advancing sequences.
- Malformed-input empty-result behavior follows 5.0.13, which can differ from
  the older 2.x caller's result. Ordinary app caller patterns match both.

## Verification and status

Node 24 and Bun: 147 published Bash cases, 5,768 generated nested/malformed patterns,
output caps, escaping and deep/adversarial inputs are checked. Unchanged
minimatch 5.1.9/9.0.9/10.2.4 and glob 13.0.6 source sync/async callers pass 2,064
comparisons per runtime. Fresh npm/Bun archives include the VPM delimiter
dependency and test strict CJS/ESM TypeScript 7 consumers.

See [conformance](../../scripts/brace-expansion-conformance/README.md) and
[benchmarks](bench/results/README.md). A consumer release and VentiMath adoption
remain separate from this implementation. Upstream code is a test control only.
