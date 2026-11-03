# Installing VPM packages

The calendar packages are distributed as public GitHub Release archives. Their
package versions match the **7.1.3 upstream API baseline**. The current release
contains `vfullcalendar-react`, `vfullcalendar-core` and
`vfull-ui-headless-calendar`. The styling release below also distributes clsx,
Emotion and Stylis replacements.

```sh
bun add vfullcalendar-react@https://github.com/VentiMath/vpm/releases/download/calendar-7.1.3-r2/vfullcalendar-react-7.1.3.tgz
```

The archive pins both VPM dependencies to URLs in the same release. No overrides,
registry account or GitHub authentication are required. React and React DOM
remain peer dependencies; keep the versions selected by your application.
Commit the application's `package.json` and `bun.lock`, and use
`bun install --frozen-lockfile` in CI.

The [calendar release](https://github.com/VentiMath/vpm/releases/tag/calendar-7.1.3-r2)
includes the three archives, `SHA256SUMS` and `release-manifest.json`. The manifest
records the exact source commit, dependency URLs and hashes of shipped files.
A new release gets a new tag and URLs; existing assets must not be replaced.

The `calendar-7.1.3-r2` release replaces the retained React renderer with an
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
node scripts/pack-calendar-release.cjs --ref COMMIT_SHA --tag calendar-7.1.3-r2 --out /absolute/path/to/empty-output
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
overrides. The Node CI job exercises the local archive path on each commit.
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

The [TanStack release](https://github.com/VentiMath/vpm/releases/tag/tanstack-5.105.3-r2)
contains `vtanstack-react-query` and `vtanstack-query-core`, both **5.105.3** to
identify their upstream comparison baseline. They independently implement the
[query and mutation APIs VentiMath uses](../packages/vtanstack-react-query/README.md),
not TanStack's entire export surface. Infinite queries, suspense, hydration,
persistence and `useQueries` are outside this release.

Revision **r2** fixes React notifications during async retry actions, including
reloading partial results and retrying an empty catalog. Cache updates remain
synchronous; React subscriptions use the notification scheduler. The original
release and its assets are unchanged.

Replace the application's existing dependency entry with:

```json
{
  "dependencies": {
    "@tanstack/react-query": "https://github.com/VentiMath/vpm/releases/download/tanstack-5.105.3-r2/vtanstack-react-query-5.105.3.tgz"
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
node scripts/pack-tanstack-release.cjs --ref COMMIT_SHA --tag tanstack-5.105.3-r2 --out /absolute/path/to/empty-output
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
