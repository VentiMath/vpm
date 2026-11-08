# vreact-autosuggest

Independent React implementation of the **react-autosuggest 10.1.0** navigation
search contract used by VentiMath. The comparison target is both its application
pin and the current upstream release checked November 7, 2026.

```tsx
import Autosuggest from "vreact-autosuggest";

<Autosuggest
  suggestions={suggestions}
  inputProps={{ value, onChange: (_event, { newValue }) => setValue(newValue) }}
  onSuggestionsFetchRequested={({ value }) => setSuggestions(search(value))}
  onSuggestionsClearRequested={() => setSuggestions([])}
  getSuggestionValue={(item) => item.title}
  renderSuggestion={(item) => <span>{item.title}</span>}
  highlightFirstSuggestion
/>;
```

The input value and suggestions are controlled by the caller. Arrow keys traverse
results and the unhighlighted position; Escape restores the typed query or clears
an already closed input. Enter and mouse clicks select results. `renderSuggestion`
receives `{query, isHighlighted}`. Fetch, clear, selection, highlight, focus and
blur callbacks retain the documented parameters and reason/method strings.

Custom input renderers must forward the supplied input props and ref. Custom
suggestion containers must forward `containerProps`, including its ref; portals
are supported. The component ref exposes `.input`. Existing theme keys support
classes, inline styles and decorated style maps through `vreact-themeable`.
With `highlightFirstSuggestion`, incremental typing reapplies the first-result
policy even when consecutive characters retain the same filtered items; Enter
and arrow navigation start from that highlighted result.
Grouped lists, always-visible suggestions, first-result highlighting, selection
focus policy and custom render predicates are included. No styles are imposed.

The runtime uses `vreact-themeable`, `vsection-iterator` and `vshallow-equal`.
React 19 is a peer. It contains no copied upstream runtime, Promise polyfill or
runtime prop-types dependency. Node 24 and Bun are the verification runtimes.

Intentional differences:

- Enter during IME composition cannot submit a suggestion. Keyboard-induced
  scrolling does not let a stationary pointer change the highlight.
- Caller input refs are forwarded, including React 19 callback-ref cleanup.
- Empty groups are omitted, as upstream's documentation promises; its current
  runtime can render them and retain a nonexistent active descendant. Empty
  result updates explicitly clear the highlight and notify `null`.
- `shouldKeepSuggestionsOnSelect` keeps the list visible for Enter as well as
  clicks. Highlight callbacks report changes, without redundant notifications
  when the highlighted object stays the same.

This completes the **navigation widget unit**. It does not assert compatibility
with undocumented component internals, old React releases, or legacy standalone
UMD builds. Both actual FuseSearch variants also pass browser interaction checks with their
real MUI TextField/Popper and synthetic navigation in MemoryRouter. App adoption,
full-page visual acceptance and assistive-technology
speech checks remain separate. The current app still uses upstream Autosuggest.

[Conformance](../../scripts/autosuggest-widget-conformance/README.md) covers
server output, real Chrome interaction and exact packed installs.
[Benchmarks](bench/results/README.md) retain comparison/control samples; they
measure rendering, not network latency or a complete application page.


The [Autosuggest release installation recipe](../../docs/INSTALLATION.md#navigation-autosuggest)
provides this package in the `autosuggest-10.1.0-r2` set with pinned internal URLs.
Release availability and application adoption are separate milestones.
