# Build dependencies: remove requirements before replacing packages

The November 4, 2026 application audit found 40 distinct `@babel/*` package
names in its lockfile. That is an installation inventory, not 40 compiler
features the application calls. Do not create a `vbabel` family from that count.
The current application uses Vite 6.4.1 and React plugin 4.4.1; the current
upstream upgrade targets checked were Vite 8.3.5 and React plugin 6.2.1.

## Decisions

| Owner of the dependency | Evidence and useful next action | VPM implementation decision |
| --- | --- | --- |
| `vite-plugin-svgr` → `@svgr/core` / `@svgr/plugin-jsx` → Babel | The default plugin is configured, but tracked application code has no `.svg?react` consumers. Remove the plugin/configuration and regenerate the lockfile; verify the application build. Shared Babel packages can remain through other owners. | Do not rebuild the unused SVG transform chain. This is a removal candidate, not a completed app change. |
| `@vitejs/plugin-react` 4 → Babel core and React development transforms | Migrate Vite and the React plugin together. React plugin 6 uses Vite 8's Oxc transforms for normal JSX/Fast Refresh. Preserve the Emotion JSX source, aliases, `.js` JSX handling, CSS and HMR behavior during acceptance. | Do not rebuild the old React transform plugins. A complete app build/dev/browser check is still required before adopting the upgrade. |
| `@astryxdesign/cli` → `jscodeshift` → Babel compiler, Flow/TypeScript presets and transforms | This is developer code-migration tooling. The application does not directly import jscodeshift. Isolating a pinned CLI in a tooling workspace can remove its closure from the application install; it does not remove the CLI's own need for a parser. | Do not rebuild compiler infrastructure for a maintenance command. Retain the CLI's behavior when moving it. |
| Emotion Babel plugin, `babel-plugin-macros` and helper imports | Current Vite configuration selects Emotion's JSX runtime but does not enable an Emotion Babel transform, and no tracked Babel configuration was found. An alias or installed plugin is not evidence that Babel executes it. VPM Emotion runtime packages already avoid the upstream plugin/runtime helper dependency. | Do not rebuild remaining upstream macro/compiler helpers for this runtime path. Review remaining upstream Emotion owners and remove unused explicit plugin installation/configuration separately. VPM's optional existing Babel plugin remains available for callers that actually compile with it. |
| `@babel/runtime` beneath MUI, drag-and-drop, localization, transitions and test libraries | Precompiled packages still import these helpers. Removing the package or aliasing it to an empty module would break live callers. | Eliminate helpers as those callers are independently rewritten using the chosen modern runtime/browser target. Keep runtime support for unchanged compiled dependencies. |

The first three compiler owners share dependencies: removing one root does not
prove `@babel/core`, parser, traversal or generator disappears from the lockfile.
After each consumer change, re-resolve the graph and inspect the built bundle.
No application dependency changes or Vite upgrade are claimed by this audit.

The [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) and
[migration guide](https://vite.dev/guide/migration) describe Oxc/Rolldown and the
changed build options. The [React plugin documentation](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react)
keeps Babel-based React Compiler opt-in separate from its normal React transform.
The [SVGR plugin usage](https://github.com/pd4d10/vite-plugin-svgr#usage) documents
its default `.svg?react` filter. The [Babel runtime documentation](https://babeljs.io/docs/babel-runtime)
explains the separate generated-code helper requirement.

## The same rule applies outside Babel

Radix Popper 1.4.0 declares `@radix-ui/react-use-rect` and `@radix-ui/rect`, but
neither appears in its shipped JavaScript imports. The application's older
installed Popper implementation also imports `useSize` for the arrow. The
current caller uses `@radix-ui/react-use-size` 1.1.5 instead. Build and validate
that real caller path; do not implement `useRect` just to satisfy stale manifest
edges. Existing [vradix-rect](../packages/vradix-rect) remains an independently
implemented observer, but it is not a prerequisite for the current Popper port.

A future VPM Popper package should omit those unused rectangle dependencies.
This conclusion is specific to the inspected Popper caller, not a claim that
no application anywhere needs rectangle observation.

## DOM helpers in transitions

The November 7 caller audit found that MUI navigation `Collapse` uses
`react-transition-group`'s `Transition`, which calls no `dom-helpers` functions.
The calendar and notes date pickers do use `CSSTransition`, through MUI's
`PickersSlideTransition`, but only for `addClass` and `removeClass`.

Do not build a broad `vdom-helpers` package for this path. The independent
[vreact-transition-group](../packages/vreact-transition-group) caller now owns
two native class-list operations, eliminating the helper dependency and its own
Babel runtime edge. Current 6.0.1 and app-pinned
5.2.1 controls match these operations in unchanged MUI browser callers, including
iframe ownership and SVG/class-token checks. See the reproducible
[caller audit](../scripts/transition-dom-audit/README.md).

The app still installs the original transition package and DOM helpers. The VPM
replacement no longer requires them. Its [consumer release](INSTALLATION.md#react-transitions-for-mui)
is available; app dependency adoption is still separate. Other callers can still require shared Babel helpers.

## Accent removal in table filters

VentiMath's Material React Table 3.2.1 calls `rankItem` from
`@tanstack/match-sorter-utils` 8.19.4. Both that version and current 9.2.6 embed
an accent table despite also declaring `remove-accents`.

[vtanstack-match-sorter-utils](../packages/vtanstack-match-sorter-utils) owns its
ranking and Unicode normalization, so this path needs no separate
`vremove-accents`. It handles canonical Latin decompositions, retains the
established non-decomposing letter expansions, and preserves unrelated scripts.
Only single-character folds from bounded Unicode ranges are cached; caller
queries and table records are never retained. The unchanged MRT fuzzy filter
passes against both controls, with deliberate normalization improvements tested
separately. See [conformance](../scripts/match-sorter-conformance/README.md).

This closes the ranking dependency, not the whole table stack. Consumer
publication and application adoption remain separate. Other callers may still
need their own accent-removal implementation.

## TypeScript path aliases

[vvite-tsconfig-paths](../packages/vvite-tsconfig-paths) independently handles the
non-compiler path used by the app's Vite configuration. Its only runtime
dependency is [vtsconfck](../packages/vtsconfck). Native `path.matchesGlob` replaces
`globrex`, and ordinary operation needs no `debug` helper. Do not create a separate
`vglobrex` for this caller. Current stable 6.1.1 and app 5.1.4 controls agree across
alias comparisons and real Vite builds; the app's alias map is compared read-only.
Publication/adoption and other callers of shared dependencies remain separate.

## Balanced delimiters in file patterns

[vbalanced-match](../packages/vbalanced-match) owns the delimiter scan beneath
brace-expansion and minimatch. Its current named API targets balanced-match
5.0.0; the callable CommonJS entry also supports the older brace-expansion 2
caller. Unchanged brace-expansion 2/5 and minimatch 10 callers pass alongside
49,200 generated comparisons against three upstream versions. Empty delimiters
return no match; real brace callers use nonempty delimiters.

This completes the delimiter leaf. Its [brace expansion caller](../packages/vbrace-expansion)
is also independently built; consumer releases and application adoption remain
separate. See the
[conformance commands](../scripts/balanced-match-conformance/README.md).

## Brace expansion in glob callers

[vbrace-expansion](../packages/vbrace-expansion) targets current 5.0.13 with
vbalanced-match as its only runtime dependency. Its explicit frame stack owns
nested expansion, and output/work budgets bound products and rewrites. The
current option names and defaults are supported; operation counts and strict
input handling have documented differences.

The application installs brace-expansion 2.0.2 and 5.0.4 through minimatch.
Unchanged minimatch 5.1.9/9.0.9/10.2.4 and glob 13.0.6 source pass matching and real
file-enumeration comparisons with the replacement. This closes the brace
expansion layer, not all of minimatch/glob. Consumer publication and application
adoption remain separate.


### File-pattern matching

`vminimatch` independently targets minimatch 11.0.9 and preserves the callable
and segment-test interfaces used by older build consumers. Its runtime closure
is `vbrace-expansion` → `vbalanced-match`. Current and historical matching
controls, unchanged glob 13 raw file discovery, and historical Redocly URL/header selection
are verified; [scope and evidence](../packages/vminimatch/README.md) distinguish
matching support from unimplemented upstream introspection APIs.

Glob 13 embeds dependencies in its default entry. An npm override alone does not
replace that embedded matcher; the verified fixture deliberately uses its
published `glob/raw` source entry and instruments replacement calls.
`vminipass` supplies the independent streaming leaf and `vpath-scurry` the
cached directory walker. `vglob` now combines these for filesystem searches.

## Minipass streams

[vminipass](../packages/vminipass) targets 7.1.3 with no package dependencies.
It implements the object streams used by glob 13 and path-scurry 2, along with
byte/string decoding, pipe backpressure, collection, iteration and abort cleanup.
83 unchanged caller checks, 50,000 generated operations and fresh archive
installs pass on Node and Bun. Thirty unchanged upstream regression files pass
on Node; the TAP harness itself cannot run on Bun's incomplete V8 Serializer.
The flowing-write follow-up removes generic event forwarding overhead without
bypassing listener or lifecycle behavior; [measurements](../packages/vminipass/bench/flow/README.md) supersede the original Bun regression.

## Cached filesystem paths

[vpath-scurry](../packages/vpath-scurry) independently targets 3.0.0 with the
app's 2.0.2 behavior checked. Its runtime closure is vlru-cache and vminipass.
59,256 differential checks, 278 unchanged glob 13 caller checks, 17 selected
upstream groups and fresh npm/Bun archives pass. Resolution after `chdir()`
clears stale strings; Windows roots follow the current v3 contract. This does
not replace glob's bundled default entry or change application pins.

## Filesystem glob caller

[vglob](../packages/vglob) independently targets glob 14.0.6 while checking the
installed frontend 13.0.6 and backend 10.5.0 APIs. The unchanged rimraf 6.1.3 and
5.0.10 callers select and remove the same files in disposable fixtures. Its
seven-package runtime closure is entirely VPM. The implementation shares one
segment-state traversal between sync/async calls and streams, supports subtree
pruning and abort, and bounds cyclic symlink following. It is built and verified;
release and app adoption are separate. [vrimraf](../packages/vrimraf) now supplies
the independent cleanup caller, including the archive cleanup used by Capacitor.

## JSON configuration files

[vjsonfile](../packages/vjsonfile) independently targets jsonfile 6.2.1 with
zero package dependencies. Its callback, Promise and synchronous APIs and
`utils` formatter pass unchanged fs-extra 11.3.4/9.1.0 and Capacitor 8.2.0 config
callers. Native filesystem operations replace universalify and the optional
graceful-fs wrapper; descriptor-exhaustion retry queueing is outside this package.
[vfs-extra](../packages/vfs-extra) now supplies the independent caller above it,
targeting 11.4.1 with the app's 11.3.4 and Ionic's 9.1.0 checked. The verified
Capacitor workflows cover asset copies, config files, Swift template moves and
obsolete CocoaPods cleanup. Its only package dependency is vjsonfile. These source packages are built and
verified;
release and application adoption remain separate.


[venv-paths](../packages/venv-paths) supplies the directory choices used directly
by Capacitor's system configuration and IPC log caller. It targets env-paths 4.0.0
with zero dependencies, implements the small filename check locally, and retains
the installed 2.2.1 caller's CommonJS/empty-suffix behavior. The current validation
rejects names that the old version accepted. Current/app contract controls and
unchanged configuration/log operations pass on Node/Bun. OS path rules are
simulated; native Windows execution, public release and app adoption remain
separate.
