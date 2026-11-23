# vminimatch

Independent glob matching for VentiMath's build tools and URL/header patterns, targeting minimatch **11.0.9**. Uses `vbrace-expansion` and `vbalanced-match`; no upstream runtime code or matcher package is included.

```js
const minimatch = require('vminimatch');
minimatch('src/ui/card.tsx', '{src,functions}/**/*.{ts,tsx}'); // true
const matcher = new minimatch.Minimatch('**/!(*.test).tsx');
matcher.match('src/ui/card.tsx'); // true
```

ES modules expose the same helpers by name and a callable default. Public declarations work without Node or DOM types.

## Scope

Stars, globstars, character classes (including Unicode POSIX classes), nested and negated extglobs, brace alternatives and ranges, dotfiles, comments, negation, basename matching, partial traversal, Windows drive/UNC roots and Unicode normalization are covered. Large safe numeric ranges remain compact. `filter`, `match`, `defaults`, `escape`, `unescape`, `braceExpand` and `Minimatch` are available.

Matching uses an independently written position-set interpreter with explicit stacks. User patterns never become native regex quantifiers. Native regular expressions are limited to lexical scans and single-character classes. Path/segment work is bounded; exhausting a work budget throws `RangeError`, rather than silently answering false. Pattern length is limited to 65,536 UTF-16 units. Brace expansion inherits [VPM's expansion bounds](../vbrace-expansion/README.md).

## Caller compatibility

VentiMath main `2721de95` retains glob 13.0.6/minimatch 10.2.4 through rimraf, plus an older glob 10/minimatch 9 closure under Firestore/GAX. Redocly is no longer installed on that main revision; its 1.34.10 URL/header caller is retained only as a historical compatibility fixture. Tests exercise **unchanged glob 13.0.6 raw sources** and that **historical Redocly fixture**, with the replacement instrumented to prove it ran. Glob's default entry bundles its matcher: an ordinary dependency override cannot replace that bundled code. A future `vglob` must consume the VPM matcher directly.

For older callers, CommonJS remains callable and segment matchers satisfy `instanceof RegExp`. Their `test`/`exec` methods use our interpreter. The legacy `makeRe` helper offers the same adapter. Its native `.source` is a dummy, **not a serializable regex**; reconstruction, string replacement and other inherited regex operations are outside this compatibility contract. Current minimatch 11 no longer exposes `makeRe` or its old `AST` API.

Upstream optimizer/cache internals are not implemented. `maxGlobstarRecursion` remains an accepted compatibility setting; this implementation has no recursive globstar walk. Options are copied at construction. Unsafe numeric ranges stay literal under VPM's brace rules. Compact numeric ranges can expose actual directory-entry casing through older glob callers where expansion into literal paths reports pattern casing.

This package is built and locally verified, not published or adopted by the app. It does not claim a universal override for every historical minimatch API.

## Verification

- 588 upstream fixture comparisons across optimization levels 0/1/2; 28,900 generated comparisons against 11.0.9, 540 parent-traversal comparisons and 1,200 stable caller-pattern comparisons against versions 5/9/10.
- Upstream extglob regressions, Windows/Unicode/class/escaping cases, compact ranges, partial matching, deep nesting and bounded adversarial inputs.
- 214 unchanged glob/Redocly checks on each runtime, with positive instrumentation of replacement calls.
- Fresh/frozen npm and Bun installs of the three-package VPM closure; CJS/ESM and TypeScript NodeNext/Bundler consumers.

Commands and pinned controls: [conformance](../../scripts/minimatch-conformance/README.md). Benchmarks use [separate alternating processes](../../docs/DEVELOPMENT.md#replacing-a-package); [measurements and remaining regressions](bench/README.md) retain raw results and controls.
