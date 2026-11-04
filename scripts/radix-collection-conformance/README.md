# Radix Collection controls

Pins Collection 1.2.0, Dropdown Menu 2.2.1 and Roving Focus 1.2.1. The same tests
run on React 19.1.0 and 19.2.4. Browser and test bundles replace only the Collection
import for the VPM variant; caller source stays unchanged. Both sides use the
same build settings and peer versions. Generated bundles record source hashes;
tests and benchmarks reject stale bundles.

```sh
npm --prefix scripts/radix-collection-conformance ci --ignore-scripts
npm --prefix scripts/radix-collection-conformance/current ci --ignore-scripts
bun scripts/radix-collection-conformance/build.cjs
node --test packages/vradix-react-collection/test/*.test.cjs
bun test packages/vradix-react-collection/test
node scripts/radix-collection-conformance/archives.cjs
```

Nine groups per runtime cover paired client/server checks on both React versions
and pinned upstream source integrity. The stable API covers custom metadata,
refs, DOM order, manual reorder, removed/replaced elements, portals, independent
scopes, duplicate slots, StrictMode and hydration. VPM's layout registration and
exclusion of items outside the root are explicit differences; upstream controls
assert its passive registration and outside-root entries instead of hiding them.

Archive checks pack all five VPM dependencies and install them into clean npm/Bun
consumers, including frozen reinstall, CJS/ESM identity, SSR and TypeScript 7
NodeNext/Bundler with DOM-only ambient libraries. Chrome executes both variants
on both React versions. Its actual Menu caller tests keyboard opening, Home/End,
disabled-item skipping, reordered items, typeahead and Escape/focus restoration;
Roving Focus tests LTR/RTL movement and looping. Collection also runs in an iframe.
Opening alone is not asserted to focus the first Menu item: explicit Home
navigation is tested, consistently with the current upstream fixture.

The experimental dictionary API is not used by these callers and is outside the
implementation's scope. Native browser checks do not establish Firefox/Safari
or manual assistive-technology acceptance.
