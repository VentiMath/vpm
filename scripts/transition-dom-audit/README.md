# DOM helpers in MUI transitions

No `vdom-helpers` package is needed for the inspected application callers. Keep
this dependency until the transition caller is independently replaced, then
inline its two class-list operations there.

The app pins dom-helpers 5.2.1; the current upstream target inspected is 6.0.1.
Both are comparison controls here. The only installed caller is
react-transition-group 4.4.5:

- MUI 7.2.0 navigation `Collapse` uses `Transition`, which calls no DOM helpers.
  Its height styles and transition callbacks are handled by MUI and Transition.
- MUI X 8.7.0 `DateCalendar`, used inside the calendar and notes `DateTimePicker`
  dialogs, uses `CSSTransition` through `PickersSlideTransition`. It needs only
  `addClass` and `removeClass`.
- `CSSTransition` already splits class strings into individual tokens. Native
  `node.classList.add(token)` / `remove(token)` cover the tested modern HTML and
  SVG paths. No separate owner-document, CSS/style or event helper is called.
  No old-browser fallback is required by the current application target.

## Evidence

[Provenance](provenance.json) records pinned public source hashes and the inspected
application commit/call-site hashes. Application source is not vendored. The
browser build fails if these public caller files change or import another DOM
helper; controls use the unchanged MUI and transition implementations.

Chrome compares app 5.2.1, current 6.0.1 and native operations in 18 actual MUI
caller snapshots across the main document and an iframe. It checks expanded and
collapsed height, completion callbacks, owner-document focus, forward/backward
month changes, transition classes and their cleanup. A throwing-helper control
proves Collapse does not use the dependency; direct positive probes prove the
instrumentation is active. Native HTML/SVG tokens and both owner documents are
also checked. Node 24 and Bun compare token semantics, repeated operations,
punctuation and rejected tokens.

```sh
npm --prefix scripts/transition-dom-audit ci --ignore-scripts
node scripts/transition-dom-audit/contracts.cjs
bun scripts/transition-dom-audit/contracts.cjs
bun scripts/transition-dom-audit/build.cjs
node scripts/transition-dom-audit/browser.cjs
```

This is an elimination audit, not a completed transition implementation or an
application dependency change. It makes no performance claim, creates no release
archive and does not justify removing other packages' shared Babel helpers.
Transition lifecycle, cancellation, grouping and complete app acceptance belong
to the subsequent caller implementation.
