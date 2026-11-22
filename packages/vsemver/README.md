# vsemver

Independent semantic-version checks for VentiMath’s build tools. Targets semver
7.8.6; unchanged Babel Core and compilation-targets callers are also compared
with the app’s semver 7.5.4 and Babel’s older 6.3.2 control. No runtime dependencies.

```js
import semver from "vsemver";

semver.satisfies("24.22.1", ">=24"); // true
semver.diff("8.1.0", "8.2.0");      // "minor"
new semver.Range("^7 || ^8").test("7.29.0"); // true
```

## Scope

The root CommonJS and ESM entries expose `SemVer`, `Comparator`, `Range`,
`parse`, `valid`, `clean`, `coerce`, `diff`, `major`, `minor`, `patch`,
`prerelease`, `compare`, `rcompare`, `compareLoose`, `compareBuild`,
`compareIdentifiers`, `rcompareIdentifiers`, `gt`, `gte`, `lt`, `lte`,
`eq`, `neq`, `cmp`, `sort`, `rsort`, `satisfies`, `validRange`,
`intersects`, `toComparators`, `minSatisfying`, `maxSatisfying` and
`SEMVER_SPEC_VERSION`.

Range checks support conjunctions, alternatives, wildcard/partial versions,
hyphens, caret and tilde ranges, loose parsing and explicit prerelease inclusion.
Build metadata does not affect release precedence. Public version and range
instances remain mutable. Convenience checks use a private cache bounded to
256 entries, so mutation of a public instance cannot poison another caller.

A confirmed difference from both upstream controls: changing a comparator’s
version inside one public Range can alter later upstream range checks because
they share cached objects. VPM returns isolated mutable objects and keeps its
cache private. The regression test covers this case and cache eviction.

This is the app-used library surface, not the complete npm semver distribution.
Release incrementing, `minVersion`, `outside`/`gtr`/`ltr`,
`subset`/`simplifyRange`, `truncate`, upstream regex internals, the CLI and
internal module subpaths are not implemented. Error types are preserved;
parse/constructor error wording is not promised.

## Verification

Node 24 and Bun 1.4.4 run the upstream version/range fixtures, generated
release/prerelease comparisons and mutation-isolation tests. The fixture data
retains its upstream license; the runtime is independently written.

Babel Core and compilation-targets are loaded unchanged with this package
substituted as their `semver` dependency. Target resolution, JSX transformation,
plugin API version gates and runtime/helper checks exercise real callers.
Fresh npm and Bun installs check CJS/ESM exports and run those callers on both
runtimes. [Benchmarks](bench/README.md) measure isolated operations and Babel
target resolution. The app’s dependency pins are unchanged.
