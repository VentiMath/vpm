# vminimist

Parse command-line options with the familiar minimist API, coherent aliases,
own-property lookups and self-contained TypeScript declarations. Derived from
**minimist 1.2.8**, with zero runtime dependencies. Supports Node.js 20+ and Bun,
CommonJS and native ES module default imports.

```js
const parse = require('vminimist')
// Also: import parse from 'vminimist'
const args = parse(['--port=08080', '-v', 'input.json'], {
  string: 'port',
  boolean: 'verbose',
  alias: { verbose: 'v' },
  default: { port: '8080' }
})
// { _: ['input.json'], verbose: true, v: true, port: '08080' }
```

## API

`parse(arguments, options?)` returns an ordinary object with an `_` array for
positionals. Arguments are a readonly array of strings or finite numbers; the
legacy empty-string input is also accepted. Inputs and configuration lists are
snapshotted before unknown-option callbacks run. Only own option properties and
own entries in alias/default dictionaries are used.

| Option | Contract |
| --- | --- |
| `string` | A name or readonly array of names whose values avoid numeric conversion. `_` applies to positionals. |
| `boolean` | A name/list initializes boolean flags to false (or their defaults). `true` treats long flags without `=` as booleans. |
| `alias` | Maps names to names/lists. Overlapping and cyclic definitions form one transitive group. String/boolean classification applies to every member. |
| `default` | Own values used when an option is absent. Values are not deeply cloned; opaque objects retain their identity. Parsing never writes through those objects. |
| `stopEarly` | Boolean. Append the remaining arguments unchanged after the first positional, even when the unknown callback declines it. |
| `--` | Boolean. Put arguments after the first `--` in a separate `result['--']` array. Otherwise append them unchanged to `_`. |
| `unknown` | Called with the original unknown token; returning exactly false skips it. Exceptions propagate. A grouped short token can invoke it once per unknown flag. |

Options may be omitted or null. Names must be nonempty strings, flags must be
booleans, dictionaries must be objects, and callbacks must be functions.
Malformed configuration throws TypeError. Unknown configuration fields are ignored.

The parser retains long options, `--name=value`, `--no-name`, clustered short
options, attached short values, repeated-value arrays and dotted names. It also
retains minimist's short-option grouping and negative-number token rules; use
`--count=-3` when supplying a negative value. Explicit string options preserve
numeric-looking identifiers. Numeric conversion uses JavaScript Number, including
its precision and overflow behavior; it is not a safe-integer validator.

TypeScript exports `Options` and `ParsedArgs` through the callable namespace.
Dynamic option values have type `unknown` and require narrowing; positionals and
the optional `--` array have element type `string | number`.

## Corrections and compatibility differences

- Internal dictionaries and own-property checks prevent names such as `toString`
  from colliding with inherited configuration. Output objects retain ordinary
  prototypes; colliding names become own data properties without invoking
  inherited setters.
- Aliases form complete groups. For `{a: 'b', b: 'c'}`, setting any member updates
  all three consistently. Boolean aliases correctly parse `--alias=false` as
  false. Dotted booleans use their full names, not an unrelated final segment.
- `_` and `--` are reserved output arrays. Options/defaults/aliases cannot write
  those names or descend into them. Paths containing `__proto__`, `constructor`
  or `prototype` are ignored, including through aliases and defaults. This is a
  stricter key policy than upstream, which already guards prototype pollution.
- Assigning through a scalar, repeated-value array or caller-owned default
  object throws `TypeError('conflicting argument paths')`. Descending through
  parser-created dotted objects is supported. This avoids modifying supplied
  default values or relying on incidental JavaScript errors.
- Argument and option getters are read once during snapshotting. Inherited
  options are ignored, invalid inputs fail without arbitrary value coercion, and
  callbacks cannot change later arguments/configuration during the same parse.
- Uppercase `E` in numeric exponents is accepted. Remaining numeric syntax follows
  the pinned baseline. Large `stopEarly` tails use non-variadic appending.

Defaults for an alias group use the first applicable configured default. For a
boolean group, an explicitly listed boolean name's default takes precedence over
other group members. Conflicting defaults should be avoided. Returned default
objects remain shared references; callers that mutate them must copy them first.

## Verification

```sh
node --test packages/vminimist/test/*.test.cjs
bun test packages/vminimist/test
npm run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

The tests run all **61 upstream tests with unchanged assertions**, using a small
Tape registration/assertion adapter for the built-in runner. **23 additional tests**
cover the corrections above, 5,000 generated upstream comparisons, 3,000-level
dotted paths, 2,000-link alias chains, large argument tails, getter counts,
module imports and source integrity.

The shared integration gate runs `vfunctions-framework`, the VPM counterpart to
Functions Framework 5.0.2, which uses this parser directly.
Six startup-option scenarios exercise defaults, CLI/environment precedence,
string preservation, paths, booleans, `--`, prototype-shaped names and invalid
signature rejection through the framework's actual `parseOptions` function.
[Current shared verification](../../IMPROVEMENTS.md#current-verification) and
[HTTP integration coverage](../../IMPROVEMENTS.md#the-integration-gate) are tracked
centrally. These checks do not deploy VPM into an application.

## Installation and provenance

Available from this workspace or as a package archive. Run
`bun pm pack --ignore-scripts` in this directory and install the resulting
`vminimist-0.1.0.tgz` with npm or Bun. The archive contains six files: source,
declarations, metadata, README, license and provenance. Tests and benchmarks stay
in the repository. Registry publication and automatic substitution are future work.

[PROVENANCE.json](PROVENANCE.json) records the verified npm archive integrity,
upstream revision, and hashes of the unchanged comparison source and test files.
[LICENSE](LICENSE) retains upstream's MIT license.

## Benchmarks

```sh
node packages/vminimist/bench/compare.cjs
bun packages/vminimist/bench/compare.cjs
```

Run these commands from the repository root. `COUNT` sets iterations and `OUTPUT`
writes a JSON report. The harness verifies equal outputs for measured cases,
retains outputs in 256 slots, and consumes them outside timing. These are complete
parser calls with configuration, validation and output allocation included.
They do not measure process launch, full framework startup or HTTP throughput.

### Results, 2026-10-28

Node 24.22.1 and Bun 1.4.0 on macOS arm64. Three fresh processes per runtime,
run sequentially, with ten alternating samples per case (five of each order).
Each sample uses 20,000 calls, or 2,000 for the 1,000-argument tail. Corpus warmup
uses 2,000 calls per case/implementation, followed by case warmup of
min(iterations, 10,000). Values are medians of the three process medians.

| Operation | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| empty | 421 → 278 | 497 → 197 |
| Functions Framework arguments | 2,868 → 2,017 | 2,462 → 1,188 |
| simple long flags | 1,703 → 911 | 1,459 → 547 |
| grouped short flags | 1,855 → 1,113 | 1,878 → 613 |
| numeric values | 1,639 → 1,134 | 1,484 → 581 |
| repeated values | 10,575 → 6,375 | 7,492 → 4,249 |
| dotted values | 11,090 → 11,436 | 6,249 → 4,089 |
| aliases and booleans | 2,773 → 2,513 | 2,041 → 1,286 |
| unknown filter | 977 → 702 | 795 → 407 |
| stopEarly 1000 arguments | 4,232 → 4,855 | 13,450 → 9,350 |

Across the three processes, parsing Functions Framework's argument list takes
**28–30% less time on Node** and **48–52% less on Bun**. Simple long flags take
**46–51% / 62–63% less**, and repeated values take **40–42% / 40–48% less**.
These figures concern the parser call, not full framework startup.

Node's dotted-option case varies from 3% less to 3% more time; the alias/boolean
case varies from 11% less to 1% more. Neither establishes a consistent Node gain.
The 1,000-argument `stopEarly` case costs **15–23% more on Node** (aggregate
4.23 → 4.86 µs): VPM validates and snapshots every argument before invoking
callbacks, while upstream can append an unvalidated tail. It still takes
**30–35% less on Bun**. The additional validation and non-variadic handling are
retained; no universal speedup is claimed.

[Six raw reports](bench/results) include every sample, runtime metadata, consumed
checksums, source/fixture/provenance hashes and the exact harness hash.
