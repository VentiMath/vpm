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
replacement no longer requires them; a consumer release and app dependency
update are still needed. Other callers can still require shared Babel helpers.
