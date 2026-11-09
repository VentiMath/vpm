# vmaterial-react-table

An independently written Material React Table **3.2.1** implementation for
VentiMath’s flat resource and contest tables. It uses MUI for rendering and the
VPM Table, fuzzy-ranking and highlighting implementations for data behavior.
No upstream Material React Table runtime is shipped.

## Supported caller

The shared DataTable and its custom toolbar can keep their existing exports and
options. Coverage includes sorting (custom comparators and undefined-last), global
fuzzy search, text/select/multi-select filters and filter modes, faceted values,
grouping and expansion, row selection/actions, pagination, column
ordering/hiding/pinning, density, fullscreen, custom cells, icons and MUI prop
callbacks. Cells render as React components, so custom cells may use hooks.
Column movement is available through menus and keyboard controls as well as drag.

The six-package VPM dependency closure contains this widget, React Table, Table
core, Store, match-sorter-utils and highlight-words. It has no runtime dependency
on upstream Table, React Virtual, MUI icons or date pickers. React, MUI and Emotion
remain peers. Verified peers are React 19.3.1, MUI 7.2 and Emotion 11.14;
SSR is checked on Node 24 and Bun.

## Boundaries and differences

This is the application-used contract, not the entire upstream component library.
Nested data/header trees, editing, row dragging, column resizing, virtualization,
date/range filter editors and unlisted component exports are outside scope.
Unsupported enabled features reject explicitly where detected. See the public
declarations for the accepted options.

The markup, default icons and layout are independently designed and are not
pixel-identical to upstream. Application MUI props, theme and custom toolbar
remain in control of presentation. Resetting an empty multi-select filter removes
its state entry; upstream may retain an entry with an empty array. Both return
the same rows. Global fuzzy ranking and restoration of sorting after search match
the inspected caller behavior. Common localization labels are supported; complete
upstream locale dictionaries are not a verified contract.

## Verification

[Conformance checks](../../scripts/material-table-conformance/README.md) compare
37 resource/contest caller snapshots and real Chrome control interactions against
Material React Table 3.2.1. They retain raw results, check focus preservation,
light/dark themes, escaped server output and strict TypeScript 7 consumers.
Exact six-package archives are installed with clean and frozen npm/Bun locks at
both React versions. CJS/ESM entry identity, SSR, types and browser behavior run
against those installed files.

The private caller check used the exact column factories and DataTable options
at pending VentiMath PR #421 revision `77b3abac`, with synthetic records and
presentation stubs. It does not establish app adoption or an authenticated
end-to-end check. Synthetic equivalents are retained in public CI.

[Benchmarks](bench/results/README.md) measure whole-widget server rendering with
identical peers, isolated processes, balanced order and identical-source controls.
They do not measure browser interaction latency or application performance.

Install the [Material React Table 3.2.1 release](https://github.com/VentiMath/vpm/releases/tag/material-react-table-3.2.1)
under the existing `material-react-table` dependency name. Its internal VPM
URLs are pinned; no overrides are required. See the
[installation recipe](../../docs/INSTALLATION.md#material-react-table).
Application adoption and its visual acceptance remain separate work. The
[Table-only release](https://github.com/VentiMath/vpm/releases/tag/table-9.3.1)
remains available for callers keeping upstream MRT.
