# vclassnames

Independent conditional class names targeting **classnames 2.5.1**, with no
runtime dependencies. VentiMath's Redoc documentation page is a current caller.
This is separate from `vclsx`: it preserves classnames' custom stringification,
CSS-module binding and optional deduplication contracts.

```js
import classNames from 'vclassnames';
import bind from 'vclassnames/bind';
import dedupe from 'vclassnames/dedupe';
classNames('button', { active: true }, ['compact']); // button active compact
bind.bind({ active: 'active_abc' })('active'); // active_abc
dedupe('button active', { active: false }); // button
```

Strings/numbers, nested arrays and own enumerable dictionary entries preserve
order. Custom non-native `toString` methods remain supported. The default export
and its `.default` alias share identity across CommonJS/ES modules. Dedupe retains
later exclusions and integer-key ordering. Its whitespace behavior matches the
upstream contract, including existing empty tokens.

Intentional corrections:

- Null-prototype dictionaries and non-callable `toString` fields are accepted.
- CSS-module bindings use own properties, so inherited `constructor` or prototype
  names cannot become accidental class values.
- Deep arrays use explicit traversal; cycles throw a clear `TypeError` while
  repeated shared arrays remain valid.

The differential suite checks 4,332 combinations across the three entries,
plus deep arrays and dictionary edge cases. Unchanged Redoc 2.5.0 renders a
synthetic API with identical markup and verified calls through the replacement
on Node 24 and Bun 1.4.4. Strict types and fresh/frozen packed installs are checked.
No UMD/global script build is supplied. Application adoption and release remain
separate; this does not imply contest pages use Redoc.

[Benchmarks](bench/results/README.md) retain isolated processes, balanced order,
same-code controls and source hashes. They measure helper calls, not application
rendering speed.
