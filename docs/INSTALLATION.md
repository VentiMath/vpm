# Installing VPM packages

## Material React Table

[Material React Table 3.2.1 r2](https://github.com/VentiMath/vpm/releases/tag/material-react-table-3.2.1-r2)
contains the independent `vmaterial-react-table` widget and its five VPM helpers.
Keep existing `material-react-table` imports and replace the direct dependency:

```json
{
  "dependencies": {
    "material-react-table": "https://github.com/VentiMath/vpm/releases/download/material-react-table-3.2.1-r2/vmaterial-react-table-3.2.1-r2.tgz"
  }
}
```

No overrides, import renames or registry authentication are needed. The widget
archive pins React Table 9.3.1, match-sorter-utils 9.2.6 and highlight-words 2.0.0;
Table in turn pins Table core 9.3.1 and Store 0.11.2, all to this release’s URLs.
React, ReactDOM, MUI and Emotion stay application peers. The release has no runtime
imports of upstream MRT, Table, React Virtual, MUI icons or date pickers.

This is the [flat DataTable contract](../packages/vmaterial-react-table/README.md),
including VentiMath’s custom toolbar, filters, sorting, grouping, selection/actions,
pagination and column visibility/order/pinning. Its independently designed markup
is not pixel-identical. Editing, nested data/headers, resizing, virtualization and
unlisted exports are outside scope. The package does not change application routes
or implement the resource/contest screens. Verify those screens’ styling and
business actions when adopting it; publication is not adoption.

The earlier [Table-only release](#tanstack-table) remains available for callers
keeping upstream MRT. Its `@tanstack/react-table` override is not needed by this
widget, which imports `vtanstack-react-table` directly. Only remove an existing
Table dependency or override after checking for other application callers.

The release includes `consumer-package.json`, `release-manifest.json` and
`SHA256SUMS`. Published checks install the single root URL with fresh npm/Bun
caches and frozen locks, compare all six packages to their archives, and run
React 19.3.1, Node/Bun SSR, CJS/ESM, strict TypeScript 7 and Chrome controls.

```sh
node scripts/pack-material-table-release.cjs --ref COMMIT_SHA --tag material-react-table-3.2.1-r2 --out /absolute/path/to/empty-output
node scripts/check-material-table-release.cjs /absolute/path/to/output
node scripts/check-material-table-release.cjs /absolute/path/to/output --published
```

Before publication npm redirects internal URLs to local archives; Bun checks
exact extracted bytes after a frozen peer install. The published check then uses
unchanged public dependency URLs with both managers, without overrides.

## TanStack Table

[Table 9.3.1](https://github.com/VentiMath/vpm/releases/tag/table-9.3.1) contains
`vtanstack-react-table` 9.3.1, `vtanstack-table-core` 9.3.1 and `vtanstack-store`
0.11.2. Keep existing Table imports and merge these pins:

```json
{
  "dependencies": {
    "@tanstack/react-table": "https://github.com/VentiMath/vpm/releases/download/table-9.3.1/vtanstack-react-table-9.3.1.tgz"
  },
  "overrides": {
    "@tanstack/react-table": "https://github.com/VentiMath/vpm/releases/download/table-9.3.1/vtanstack-react-table-9.3.1.tgz"
  }
}
```

The override routes Material React Table's transitive import to the same adapter.
The archive pins its two internal dependencies to sibling URLs; no registry
account or additional overrides are needed. React/ReactDOM remain app peers.
This supports current v9 hooks and the app's v8 `useReactTable` contract. Read
[the documented flat-table scope](../packages/vtanstack-react-table/README.md)
before changing other callers. Nested source rows/headers, interactive resizing
and arbitrary feature plugins are outside scope. Publication does not adopt
Table in the app or replace Material React Table itself.

The release contains exact source/archive hashes, `consumer-package.json`,
`release-manifest.json` and `SHA256SUMS`. Fresh/frozen npm and Bun installs verify
CJS/ESM, React19.3.1, TypeScript7 and Chrome caller/lifecycle checks. The 37
resource/contest scenarios cover the pending app columns, including partial
pagination, custom grouped sorting and select/multi-select filters. Performance
limitations remain in each package's benchmark report.

```sh
node scripts/pack-table-release.cjs --ref COMMIT_SHA --tag table-9.3.1 --out /absolute/path/to/empty-output
node scripts/check-table-release.cjs /absolute/path/to/output
node scripts/check-table-release.cjs /absolute/path/to/output --published
```

Before publication, npm redirects internal URLs to local archives; Bun checks
exact extracted bytes after a frozen peer install. Published checks install only
the public adapter URL with its upstream-name override and fresh caches.

## Stylis RTL middleware

The [Stylis RTL 2.1.1 release](https://github.com/VentiMath/vpm/releases/tag/stylis-plugin-rtl-2.1.1) contains `vstylis-plugin-rtl` and its pinned `vcssjanus` foundation. Keep the existing import and replace the direct dependency value:

```json
{
  "dependencies": {
    "stylis-plugin-rtl": "https://github.com/VentiMath/vpm/releases/download/stylis-plugin-rtl-2.1.1/vstylis-plugin-rtl-2.1.1.tgz"
  }
}
```

Internal dependency URLs are pinned in the archive; no additional override is needed. If the previous `cssjanus` override was added solely for this wrapper, it becomes unnecessary after this change. Verify the refreshed lockfile before removing an override shared by other callers. The middleware operates on the existing Stylis 4 tree, so it does not install a second Stylis engine.

The [package contract](../packages/vstylis-plugin-rtl/README.md) covers nested-layer and noflip corrections. Fresh/frozen npm and Bun consumers verify exact archive bytes, original-name imports, Node/Bun/TypeScript7 and Chrome computed styles. Apply the app pin and lockfile together, and check both theme directions; publication does not establish app adoption.

## CSS direction conversion

The [CSSJanus 2.3.1 release](https://github.com/VentiMath/vpm/releases/tag/cssjanus-2.3.1) provides the independent `vcssjanus` implementation. VentiMath uses it transitively through `stylis-plugin-rtl`; keep that wrapper and its imports, and merge this override:

```json
{
  "overrides": {
    "cssjanus": "https://github.com/VentiMath/vpm/releases/download/cssjanus-2.3.1/vcssjanus-2.3.1.tgz"
  }
}
```

The package has no dependencies. The release includes its exact consumer fragment, source/archive hashes and a manifest. Fresh and frozen npm/Bun installs verify that the unchanged wrapper resolves the VPM archive. The [contract](../packages/vcssjanus/README.md) documents intentional corrections and [benchmarks](../packages/vcssjanus/bench/results/README.md) retain the whole-stylesheet regression. Verify LTR and RTL in the app before treating this as adopted; publication alone is not adoption.

## Navigation Autosuggest

The [Autosuggest 10.1.0 release](https://github.com/VentiMath/vpm/releases/tag/autosuggest-10.1.0-r2)
contains `vreact-autosuggest` and the four helpers used by navigation search.
Revision r2 fixes first-result highlighting during incremental typing, including
immediate Enter selection and arrow-key restoration.
Keep the application's existing imports and replace these two dependency values:

```json
{
  "dependencies": {
    "react-autosuggest": "https://github.com/VentiMath/vpm/releases/download/autosuggest-10.1.0-r2/vreact-autosuggest-10.1.0.tgz",
    "autosuggest-highlight": "https://github.com/VentiMath/vpm/releases/download/autosuggest-10.1.0-r2/vautosuggest-highlight-3.3.4.tgz"
  }
}
```

These dependency keys install the VPM archives under the existing import names.
No import changes, Vite aliases, TypeScript paths, registry authentication or
dependency overrides are needed. The widget archive pins `vreact-themeable`,
`vsection-iterator` and `vshallow-equal` to sibling release URLs. Do not also add
a duplicate `vreact-autosuggest` dependency. Keep the app's React/ReactDOM peers;
the release checks cover React 19.1 and 19.2 on Node 24 and Bun.

| Package | API baseline |
| --- | --- |
| `vreact-autosuggest` | react-autosuggest 10.1.0 |
| `vautosuggest-highlight` | autosuggest-highlight 3.3.4 |
| `vreact-themeable` | react-themeable 1.1.0 |
| `vsection-iterator` | section-iterator 2.0.0 |
| `vshallow-equal` | shallow-equal 3.1.0, including the app's 1.2.1 array/object entry points |

The existing navigation caller was checked with its real MUI input and popup
using synthetic navigation. The [widget contract](../packages/vreact-autosuggest/README.md)
documents composition, grouped-list and ref corrections; the
[highlight contract](../packages/vautosuggest-highlight/README.md) documents
Unicode behavior. Publication does not adopt or deploy the packages. Commit the
app's dependency and lockfile changes together, then verify its search before
merging the separate consumer change.

`consumer-package.json`, `release-manifest.json` and `SHA256SUMS` record the root
pins, source commit, dependency URLs and archive/source hashes. Existing assets
are immutable; a correction uses a new revision tag.

```sh
node scripts/pack-autosuggest-release.cjs --ref COMMIT_SHA --tag autosuggest-10.1.0-r2 --out /absolute/path/to/empty-output
node scripts/check-autosuggest-release.cjs /absolute/path/to/output
# After publication:
node scripts/check-autosuggest-release.cjs /absolute/path/to/output --published
```

Before publication, npm redirects internal URLs to local archives and Bun tests
exact extracted archives after installing peers. After publication, both install
only the two public root URLs using fresh caches and no overrides. The checks
verify all five packages and frozen locks, unchanged upstream-name imports,
Node/Bun module identity and server rendering, TypeScript 7, and Chrome keyboard,
mouse, composition, focus and custom-popup behavior.

## Radix Dropdown Menu

The [Dropdown Menu 2.2.1 release](https://github.com/VentiMath/vpm/releases/tag/radix-dropdown-2.2.1)
contains `vradix-react-dropdown-menu` and its complete **35-package VPM closure**.
Each package retains its own upstream-aligned version; 2.2.1 identifies the
Dropdown Menu baseline, not the versions of all 35 foundations.

Merge these entries into the application's existing package.json:

```json
{
  "dependencies": {
    "@radix-ui/react-dropdown-menu": "https://github.com/VentiMath/vpm/releases/download/radix-dropdown-2.2.1/vradix-react-dropdown-menu-2.2.1.tgz"
  },
  "overrides": {
    "@radix-ui/react-dropdown-menu": "https://github.com/VentiMath/vpm/releases/download/radix-dropdown-2.2.1/vradix-react-dropdown-menu-2.2.1.tgz"
  }
}
```

Keep existing `@radix-ui/react-dropdown-menu` imports, including Amplify UI's.
The single upstream-name override routes transitive callers to the same package
instance as direct consumers. Do not add a duplicate `vradix-react-dropdown-menu`
dependency. React and ReactDOM 19 remain app peers. All internal VPM dependencies
are already pinned to immutable sibling release URLs: no 35-entry override
block, npm registry account or authentication is needed. Other upstream Radix
or Floating UI families are not globally replaced by this recipe.

The release includes `consumer-package.json`, `release-manifest.json` and
`SHA256SUMS`. The packer snapshots a committed dependency closure and changes
only dependency locations. Source/archive hashes identify the exact files.
Fresh npm/Bun consumers verify the public root URL, transitive caller identity,
frozen locks, Node/Bun CJS/ESM/SSR, TypeScript 7 and Chrome keyboard/pointer/focus
behavior. The package [contract](../packages/vradix-react-dropdown-menu/README.md)
records IME and iframe improvements and the limits of browser/accessibility
verification. Commit the app dependency and lockfile changes together and run
its consumer tests before merging; publication itself does not migrate the app.

```sh
node scripts/pack-radix-dropdown-release.cjs --ref COMMIT_SHA --tag radix-dropdown-2.2.1 --out /absolute/path/to/empty-output
node scripts/check-radix-dropdown-release.cjs /absolute/path/to/output
# After publication:
node scripts/check-radix-dropdown-release.cjs /absolute/path/to/output --published
```

Before publication, npm redirects internal URLs to the exact local archives;
Bun checks extracted archives after installing peers. After publication both
install the public URLs with fresh caches and only the single caller override.

## Scrumboard drag and drop

The [DND 18.0.1 release](https://github.com/VentiMath/vpm/releases/tag/dnd-18.0.1)
provides `vhello-pangea-dnd` for the application's nested column/card lists.
Keep the existing import name and replace only the dependency location:

```json
{
  "dependencies": {
    "@hello-pangea/dnd": "https://github.com/VentiMath/vpm/releases/download/dnd-18.0.1/vhello-pangea-dnd-18.0.1.tgz"
  }
}
```

React and ReactDOM 19 remain app peers. No overrides, registry authentication or
transitive runtime packages are needed. Commit package.json and bun.lock together
and verify the app before adopting; publication does not modify the app.

This release implements the app-used API, including mouse/touch/keyboard moves,
empty/cross-list drops and scrolling. It uses immediate movement previews and
has no drop animation. Virtual lists, combining and custom sensors are outside
its scope. See the [contract and browser evidence](../packages/vhello-pangea-dnd/README.md).

The release includes the archive, consumer-package.json, release-manifest.json
and SHA256SUMS. Source files are checked against the committed snapshot, and
public installs are verified from fresh npm/Bun caches using the alias above.

```sh
node scripts/pack-dnd-release.cjs --ref COMMIT_SHA --tag dnd-18.0.1 --out /absolute/path/to/empty-output
node scripts/check-dnd-release.cjs /absolute/path/to/output
node scripts/check-dnd-release.cjs /absolute/path/to/output --published
```

## VLX math rendering

**VentiLaTeX (VLX)**, pronounced **“Vee Ell Ex,”** is VentiMath's independent math
renderer. The [VLX release](https://github.com/VentiMath/vpm/releases/tag/vlx-0.2.3)
provides its `vlx` package for frontend integration:

```sh
bun add vlx@https://github.com/VentiMath/vpm/releases/download/vlx-0.2.3/vlx-0.2.3.tgz
```

Import browser rendering from `vlx` and its optional DOM lifecycle from `vlx/dom`.
No KaTeX stylesheet, engine selection, registry account or dependency overrides
are needed. The archive pins `vpngjs` to its sibling release URL. That dependency
supports the separate Node page-export entry; it is excluded from browser builds.
The native PNG rasterizer is an optional peer and is not installed by this recipe.

Version **0.2.3** retains r7's native React SVG/MathML elements without HTML insertion.
It preserves formula nodes, focus and scroll across parent updates and keeps the
same loading boundary after lazy imports. It keeps formula-only input strict
and renders all **99,635** audited expressions after verified source repairs: 165 statements, two current rubrics,
and 94 bare answer/choice values. All 99,184 originally KaTeX-accepted expressions
still render. Wrapped answers are corrected at ingestion, not by the renderer.
`observeMath` skips style/layout work for fitting or hidden formulas; forced-colors
CSS is shared per document. `preloadMath()` enables immediate first-pass React
rendering; `MathProvider` supplies shared loading and localized scroll defaults.
See the [coverage record](../scripts/vlx-conformance/production-coverage.json).

For React 19, import `InlineMath`, `DisplayMath` and `MathText` from `vlx/react`.
React remains an optional peer supplied by the app. Core imports are synchronous;
React imports split the renderer into a dynamic chunk with a compatible bundler.
For static HTML without React or `observeMath`, import `vlx/styles.css` once, or
call `installMathStyles(document)` from `vlx/dom`, for forced-colors support.

**0.2.0** adds `renderDocument` and `MathDocument` for automatic equation
numbering, labels and forward/back references. Existing formula/text components
keep their behavior; use `MathDocument` for a complete reference scope. See the
[document API](../packages/vlx/README.md#automatic-equation-references-020).
Version **0.2.1** also corrects indexed-root degrees in web and picture output,
standalone paragraph fractions, bold choice labels and break-only paragraph spacing.
**0.2.2** adds the needed Unicode glyphs and fullwidth/soft-hyphen handling.
The saved full-problem corpus renders all 20,835 records after four separately
verified source repairs; this is renderability with placeholder figures, not
complete visual acceptance. **0.2.3** typesets bounded `itemize`/`enumerate`
lists in problem pictures and preserves apostrophes/closing quotes across inline
math boundaries. These are presentation fixes; source records are unchanged.

VentiMath's verified frontend main still pins r7; upgrading the URL and lockfile,
and using the new document API, remain application-side work.

An npm registry mirror is planned for the same implementation and versioned API,
including its licenses and provenance. GitHub Release archives remain the current
installation source; the npm mirror has not been published.

VLX is an original API, so **0.2.3 is its own version**, not a claim of KaTeX or
MathJax version compatibility. The app must adapt its rendering calls rather than
aliasing those packages to VLX. Keep existing legacy source normalization, list
handling, figure descriptions and text-on-error behavior. See the
[React integration example and accessibility checks](../packages/vlx/ACCESSIBILITY.md).

Commit the app's package.json and bun.lock together and use
`bun install --frozen-lockfile` in CI. This release makes the package consumable;
it does not change or deploy the application. Actual reader/browser acceptance
remains recorded separately from the automated Chrome checks.

The release includes `vlx-0.2.3.tgz`, `vpngjs-7.0.0.tgz`,
`consumer-package.json`, `release-manifest.json` and `SHA256SUMS`. The manifest
records the committed source and exact archive/source hashes. Assets are
immutable; revisions get new tags and URLs.

```sh
node scripts/pack-vlx-release.cjs --ref COMMIT_SHA --tag vlx-0.2.3 --out /absolute/path/to/empty-output
node scripts/check-vlx-release.cjs /absolute/path/to/output
# After publication:
node scripts/check-vlx-release.cjs /absolute/path/to/output --published
```

The local checker uses npm's dependency override and Bun's exact extracted
archives before public URLs exist. The published checker installs the VLX
URL plus explicit React test peers with fresh npm/Bun caches and no overrides, verifies both packages against
the manifest, checks frozen installs, CJS/ESM, TypeScript 7 browser consumers,
and a browser build without Node/native/image engines. It runs the Chrome visual,
keyboard and accessibility-tree suite against the installed archive itself.

## Calendar

The calendar packages are distributed as public GitHub Release archives. Their
package versions match the **7.1.3 upstream API baseline**. The current release
contains `vfullcalendar-react`, `vfullcalendar-core` and
`vfull-ui-headless-calendar`. The styling release below also distributes clsx,
Emotion and Stylis replacements.

```sh
bun add vfullcalendar-react@https://github.com/VentiMath/vpm/releases/download/calendar-7.1.3-r5/vfullcalendar-react-7.1.3.tgz
```

The archive pins both VPM dependencies to URLs in the same release. No overrides,
registry account or GitHub authentication are required. React and React DOM
remain peer dependencies; keep the versions selected by your application.
Commit the application's `package.json` and `bun.lock`, and use
`bun install --frozen-lockfile` in CI.

The [calendar release](https://github.com/VentiMath/vpm/releases/tag/calendar-7.1.3-r5)
includes the three archives, `SHA256SUMS` and `release-manifest.json`. The manifest
records the exact source commit, dependency URLs and hashes of shipped files.
A new release gets a new tag and URLs; existing assets must not be replaced.

The `calendar-7.1.3-r5` release retains r3's event-identity fix and corrects
clipped hour labels, cross-row drag dates/durations and repeated-hour DST event
instants. R5 also keeps repeated-hour events visible in day/week views and
computes timed default hours/minutes as elapsed time. All-day defaults and
explicit calendar-day units keep calendar arithmetic. Use `forceEventDuration` when persisting a required end timestamp;
otherwise cross-row duration reset returns a null end, as upstream does. It retains the
replacement of the original renderer with an
independently written implementation of VentiMath's month/week/day workflow.
Its package version remains 7.1.3 to identify the upstream API baseline; the
immutable release tag identifies the revision. The original `calendar-7.1.3`
release remains available and is still the one adopted by VentiMath's checked
main branch. See [adoption evidence](ADOPTION.md).

Read the [calendar API and limits](../packages/vfullcalendar-react/README.md)
before upgrading: this implements the app-used scope, not every upstream
plugin, theme or internal API. FullCalendar 7 uses v7 imports, callback/ref types
and explicit theme stylesheets.

## Preparing a calendar release

Set the three workspace package versions to their upstream baselines and use
`workspace:*` for their local dependencies. From a committed snapshot:

```sh
node scripts/pack-calendar-release.cjs --ref COMMIT_SHA --tag calendar-7.1.3-r5 --out /absolute/path/to/empty-output
```

The packer snapshots only the three committed package directories. It rewrites
internal dependency locations to the release URLs, checks every shipped file
against that snapshot, and writes checksums plus the source manifest. It rejects
uncovered dependencies, version/baseline mismatches and nonempty output folders.
It does not publish or modify the workspace. Ordinary `bun pm pack` archives
are for local conformance checks; use the release packer for public distribution
so VPM dependencies cannot fall back to unclaimed registry names.

Run `node scripts/check-calendar-release.cjs /absolute/path/to/output` to verify
the exact extracted archives and a consumer before creating the release. This
prepublication check installs peers but cannot fetch release URLs until publication.
Run the same command with `--published` afterwards to verify public URLs without
overrides. Both modes run the date regressions on Node/Bun and native Chrome
label/interaction checks against those exact installed archives. The Node CI
job exercises the local archive path on each commit.
After publication, install only the top-level URL in a clean project without
overrides, verify both downloaded dependencies and hashes, build the app's plugin
and CSS imports, and repeat installation with the frozen lockfile.


## clsx and Emotion

The [styling release](https://github.com/VentiMath/vpm/releases/tag/styling-11.14.1)
contains `vclsx` **2.1.1**, `vemotion-react` and `vemotion-cache` **11.14.0**,
`vemotion-styled` **11.14.1**, `vstylis` **4.4.0** and the supporting Emotion
packages, each numbered for its own upstream baseline. These are compatibility
baselines; the package READMEs describe deliberate differences and retained
compatibility code. Macro entries are not provided.

For clsx alone:

```sh
bun add vclsx@https://github.com/VentiMath/vpm/releases/download/styling-11.14.1/vclsx-2.1.1.tgz
```

Use `import clsx from 'vclsx'`, or alias `clsx` to `vclsx` in the application
bundler so dependencies such as MUI use it too. The lite entry is `vclsx/lite`.

For the Emotion stack, the release includes three configuration files:

- `consumer-package.json`: merge its `dependencies` into the application's
  package.json. All 15 packages have exact release URLs; their internal VPM
  dependencies also point to the same release. No overrides or registry login
  are required. Keep the application's React/React DOM versions.
- `vite-aliases.json`: merge into Vite's `resolve.alias`. Original imports,
  including MUI's and JSX runtime subpaths, resolve to the VPM packages.
- `tsconfig-paths.json`: merge into `compilerOptions.paths` in the root
  tsconfig. These paths are relative to that config's directory. They cover
  public type entries, including JSX runtimes and `clsx/lite`.

For example, after saving the alias file beside vite.config.mts:

```ts
import stylingAliases from './vite-aliases.json';

// Merge with the application's existing configuration.
resolve: {
  alias: stylingAliases,
  dedupe: ['react', 'react-dom', 'vemotion-react', 'vemotion-cache'],
}
```

Keep `jsxImportSource: '@emotion/react'` with those aliases, or use
`vemotion-react` consistently. TypeScript's alias mapping preserves
`declare module '@emotion/react'` theme augmentation for VPM imports too.
Configure the same aliases in Vitest and any separate server build. Do not run
original Emotion contexts beside VPM contexts: theme and cache providers must
share a single runtime. Package-manager peer installation may leave upstream
Emotion files in node_modules; the verified bundler aliases prevent those
modules from entering the application bundle.

Remove superseded direct dependencies once their imports resolve through the
aliases. Commit package.json, configuration and bun.lock together; CI uses
`bun install --frozen-lockfile`. This release prepares the libraries for adoption;
it does not itself migrate or deploy VentiMath.

## Preparing a styling release

```sh
node scripts/pack-styling-release.cjs --ref COMMIT_SHA --tag styling-11.14.1 --out /absolute/path/to/empty-output
node scripts/check-styling-release.cjs /absolute/path/to/output
```

The packer snapshots committed sources, checks upstream-aligned versions,
rejects missing dependencies and unexpected archive files, pins internal URLs,
and records SHA-256 hashes. It includes the configuration files in SHA256SUMS.
The check uses the exact extracted archives before publication. After publication,
run it with `--published` to install four roots and resolve the other eleven
packages transitively from public URLs, with a fresh Bun cache and no overrides. Both modes check every shipped source hash,
Node 24/Bun MUI rendering, TypeScript 7 theme augmentation and JSX, a Vite build
containing no original Emotion/clsx/Stylis modules, Chrome theme and RTL updates,
Global cleanup and a frozen lockfile installation. Chrome is required; set
`CHROME_BIN` if it is not on a standard path.

## Floating UI

The [Floating UI release](https://github.com/VentiMath/vpm/releases/tag/floating-0.27.20-r2)
contains six independently implemented packages. Revision `r2` fixes mouse-open
menu selection and Escape routing, and accepts `*-center` as a runtime alias for
centered placement. It uses new immutable URLs; the first release is unchanged.
Install the React entry alone:

```sh
bun add vfloating-ui-react@https://github.com/VentiMath/vpm/releases/download/floating-0.27.20-r2/vfloating-ui-react-0.27.20.tgz
```

Its archive pins all VPM runtime dependencies to public URLs in the same release;
no overrides, npm registry names or authentication are needed. Keep the app's
React and React DOM 19 peers. Commit package.json and bun.lock together.

| Package | Upstream API baseline |
| --- | --- |
| vfloating-ui-react | @floating-ui/react 0.27.20 |
| vfloating-ui-react-dom | @floating-ui/react-dom 2.1.9 |
| vfloating-ui-dom | @floating-ui/dom 1.8.0 |
| vfloating-ui-core | @floating-ui/core 1.8.0 |
| vfloating-ui-utils | @floating-ui/utils 0.2.12 |
| vtabbable | tabbable 6.5.1 |

For VentiMath's direct Tiptap tooltip, popover and dropdown-menu components,
change imports from `@floating-ui/react` to `vfloating-ui-react`. These primitives
currently belong to the documentation editor example. Their cutover alone does
not remove the upstream positioning packages used by MUI/Radix, and no production
bundle reduction is claimed. Positioning,
interaction hooks and callback types come from the same entry. No global alias
is included: MUI/Radix's transitive callers require their own compatibility check.
The React package implements the app-used subset described in its
[contract](../packages/vfloating-ui-react/README.md), not every upstream API.

`consumer-package.json` contains the top-level dependency URL. `SHA256SUMS` and
`release-manifest.json` record the exact source commit, archive hashes, source
hashes and transitive URLs. Release preparation does not migrate or deploy the
application; adoption remains recorded separately in [ADOPTION.md](ADOPTION.md).

```sh
node scripts/pack-floating-release.cjs --ref COMMIT_SHA --tag floating-0.27.20-r2 --out /absolute/path/to/empty-output
node scripts/check-floating-release.cjs /absolute/path/to/output
# After publication:
node scripts/check-floating-release.cjs /absolute/path/to/output --published
```

The public check installs only the React entry and its React peers in a fresh
Bun cache, verifies all six installed packages against the manifest, checks
CJS/ESM/SSR on Node and Bun, compiles TypeScript 7 consumers and runs the mounted
Chrome interaction checks against the original. A frozen-lockfile install must
leave the lock unchanged. Safari/Firefox and assistive-technology behavior are
outside this release's automated verification; test the app's target browsers
as part of its separate cutover.

## TanStack Query

The [TanStack release](https://github.com/VentiMath/vpm/releases/tag/tanstack-5.105.3-r3)
contains `vtanstack-react-query` and `vtanstack-query-core`, both **5.105.3** to
identify their upstream comparison baseline. They independently implement the
[query and mutation APIs VentiMath uses](../packages/vtanstack-react-query/README.md),
not TanStack's entire export surface. Infinite queries, suspense, hydration,
persistence and `useQueries` are outside this release.

Revision **r3** fixes the old-error first render when failed queries remount or
are re-enabled. It retains r2’s notification scheduling for async retry actions, including
reloading partial results and retrying an empty catalog. Cache updates remain
synchronous; React subscriptions use the notification scheduler. The original
release and its assets are unchanged.

Replace the application's existing dependency entry with:

```json
{
  "dependencies": {
    "@tanstack/react-query": "https://github.com/VentiMath/vpm/releases/download/tanstack-5.105.3-r3/vtanstack-react-query-5.105.3.tgz"
  }
}
```

Merge that entry into the existing package.json, retaining other dependencies.
Keep imports from `@tanstack/react-query` unchanged. The dependency key is an
installation alias for the VPM archive; its package name remains
`vtanstack-react-query`. React Devtools also resolves that same entry, so its
provider and hooks share one context. Do not add a second `vtanstack-react-query`
dependency alongside the alias. No Vite alias or TypeScript path mapping is
needed for this recipe. Keep the application's React/React DOM peers.

The React archive pins `vtanstack-query-core` to its sibling release URL. It
requires no registry account, overrides or GitHub authentication. Commit the
resulting package.json and bun.lock together and use `bun install --frozen-lockfile`
in CI. Run application tests before merging the separate consumer cutover.
Preparing this release does not migrate or deploy VentiMath.

The release includes `consumer-package.json`, `release-manifest.json` and
`SHA256SUMS`. The manifest records the source commit, exact dependency URLs and
archive/source hashes. Existing releases are immutable; revisions use a new tag.

```sh
node scripts/pack-tanstack-release.cjs --ref COMMIT_SHA --tag tanstack-5.105.3-r3 --out /absolute/path/to/empty-output
node scripts/check-tanstack-release.cjs /absolute/path/to/output
# After publication:
node scripts/check-tanstack-release.cjs /absolute/path/to/output --published
```

Before publication, npm redirects the core URL to its exact local archive;
Bun checks the extracted archives after installing peers because it cannot
redirect URL dependencies through name overrides. After publication the checker
installs only the top-level URL with a fresh
npm/Bun cache and no overrides. Both modes verify installed source hashes,
module identity, Node 24/Bun query and mutation hooks with unchanged React
Devtools 5.91.3, TypeScript 7 consumers and a Chrome production bundle. The public
check also repeats frozen installs and requires unchanged locks. Set `CHROME_BIN`
if Chrome is not installed at a standard location.

## React transitions for MUI

[react-transition-group-4.4.5](https://github.com/VentiMath/vpm/releases/tag/react-transition-group-4.4.5)
provides the independent explicit-ref transition components used by MUI. Merge
these entries into the app manifest and regenerate its lockfile:

```json
{
  "dependencies": {
    "react-transition-group": "https://github.com/VentiMath/vpm/releases/download/react-transition-group-4.4.5/vreact-transition-group-4.4.5.tgz"
  },
  "overrides": {
    "react-transition-group": "https://github.com/VentiMath/vpm/releases/download/react-transition-group-4.4.5/vreact-transition-group-4.4.5.tgz"
  }
}
```

The override sends MUI's transitive imports to the same package. Preserve existing
React peers and imports; no separate `vreact-transition-group` dependency or Vite
alias is needed. The package adds no runtime dependencies. Unrelated callers may
still require shared Babel helpers or prop-types.

Verified with MUI7.2.0 navigation Collapse, Fade/Grow/Slide/Zoom, button ripples,
and MUI X8.7.0 picker animation, including reduced motion and iframe ownership.
React19.1/19.2, Node24/Bun, TypeScript7 and exact fresh/frozen npm/Bun installs
are checked. Live transitions require `nodeRef`; legacy `findDOMNode`,
`SwitchTransition` and `ReplaceTransition` are not implemented. Review the
[package contract](../packages/vreact-transition-group/README.md) before using
other callers. App adoption and production deployment remain separate.
