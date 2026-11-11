# vnotistack

Independent React notifications targeting **Notistack 3.0.2**, for VentiMath's
sign-in errors, calendar and board mutations, and settings-save confirmations.
Requires React/React DOM 19.3; uses `vgoober`, `vclsx` and
`vreact-transition-group` for the existing VPM foundations.

```jsx
import { SnackbarProvider, useSnackbar } from 'vnotistack';

function SaveNotice() {
  const { enqueueSnackbar } = useSnackbar();
  return <button onClick={() => enqueueSnackbar('User settings saved.', {
    variant: 'success',
  })}>Notify</button>;
}

<SnackbarProvider maxSnack={5} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
  <SaveNotice />
</SnackbarProvider>
```

## Supported contract

`SnackbarProvider`, `useSnackbar`, global `enqueueSnackbar`/`closeSnackbar`,
`SnackbarContent` and `MaterialDesignContent` are available through ESM and CJS.
Messages remain React content, with no HTML string injection. Alerts use
`role="alert"`; actions remain ordinary focusable React controls.

The queue implements `maxSnack`, explicit/generated keys, `preventDuplicate`,
`persist`, FIFO overflow and closing one or every notification. When all visible
notifications are persistent, the oldest yields to the pending notification.
Exit and collapse complete before a queued notification occupies that slot.
Provider options can be overridden per notification; queued options are
snapshotted. Changing `maxSnack` reconciles the current queue.

All five variants, six anchors, `dense`, container/root class overrides, styles,
custom icons, actions, `content`, variant `Components` and `domRoot` portals are
supported. The default slide has configurable enter/exit duration. Enter/entered,
exit/exited and close callbacks run the item callback before the provider callback.
`autoHideDuration` defaults to 5 seconds; `null` or persistence disables it. Hover,
keyboard focus and window blur pause dismissal; resumption uses half the original
duration. `disableWindowBlurListener` disables the window pause.

## Deliberate differences and limits

- Explicit keys are unique even without `preventDuplicate`, avoiding conflicting
  React identities. Generated keys and CSS classes differ from upstream.
- Global functions use the most recently mounted live provider. Removing it
  restores the previous provider; calling without any provider throws.
- Invalid queue limits, durations, keys and anchors reject before enqueueing.
  Closing still updates state and calls the other callback if a callback throws.
- Pause reasons overlap safely: leaving hover cannot restart a timer while its
  window is blurred. Portals use their own document for styles and timers.
- Default icons are independently drawn. The material palette, typography,
  spacing and positioning are compared in Chrome, but glyphs are not pixel-identical.
  Collapse takes 175 ms; upstream's collapse scheduling differs.
- Custom `TransitionComponent`/`TransitionProps` and the standalone `Transition`
  export are outside this caller contract. Custom transition options reject
  explicitly. This is not every Notistack extension API.

VentiMath currently uses provider/container options and error/success messages;
custom transitions are not part of its notification callers. The separate MUI
Snackbar used by sharing UI is not replaced here.

## Evidence and availability

[Conformance](../../scripts/notistack-conformance/README.md) includes Node 24 and
Bun 1.4.4 queue/timer tests, strict TS7 consumers, React 19.3.1 browser comparisons,
development StrictMode, SSR imports and isolated installs of all four packed VPM
packages. Node identity survives parent re-renders; unmount cancels pending timers.

[Benchmarks](bench/results/README.md) record isolated SSR work with balanced order
and identical-source controls. They do not measure browser animation or establish
an application speedup. The implementation is built and tested; no public release
or VentiMath adoption is claimed. A consumer release must pin all internal VPM
dependencies to its published artifacts.
