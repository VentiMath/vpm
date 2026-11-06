# vradix-react-menu

Independent **@radix-ui/react-menu 2.2.1** implementation for React 19. Composes
VPM positioning, focus, dismissal, presence and scroll control into accessible
menus. Thirteen direct dependencies form a 34-package VPM closure. React and
ReactDOM are peers.

```jsx
import * as Menu from 'vradix-react-menu';

<Menu.Root open={open} onOpenChange={setOpen}>
  <Menu.Anchor asChild><button onClick={() => setOpen(true)}>Actions</button></Menu.Anchor>
  <Menu.Portal>
    <Menu.Content loop>
      <Menu.Item onSelect={save}>Save</Menu.Item>
      <Menu.Item disabled>Unavailable</Menu.Item>
    </Menu.Content>
  </Menu.Portal>
</Menu.Root>
```

## Contract

All named `Menu*` components and short aliases are available: Root, Anchor,
Portal, Content, Group, Label, Item, CheckboxItem, RadioGroup, RadioItem,
ItemIndicator, Separator, Arrow, Sub, SubTrigger and SubContent. `createMenuScope`
composes independent Menu, Popper and Roving Focus contexts for wrapper libraries.
The unchanged current Dropdown Menu caller is tested with this package.

Root and Sub have controlled `open`/`onOpenChange` state; omitted `open` is false.
Root accepts `dir` and `modal` (true by default). Content forwards Popper placement
options, supports `loop`, close/entry autofocus and outside-interaction callbacks,
slots and React 19 refs. Portal supports custom containers; Portal, Content,
SubContent and ItemIndicator accept `forceMount`. Submenus follow direction,
with start/end alignment and opposite-arrow focus return. Generated trigger and
content IDs connect their ARIA attributes. If overriding IDs, supply matching
ARIA attributes as well.

Keyboard entry focuses an enabled item; pointer entry leaves focus on the menu
until hover or navigation. Arrow keys skip disabled items, Home/End and Page keys
reach boundaries, optional looping wraps, and Tab is contained. Typeahead uses
`textValue` or current item text, with a one-second search window. Enter/Space
select items; Space continues an active multiword search. Mouse hover opens a
submenu after 100 ms; touch movement does not. A short diagonal pointer corridor
keeps the submenu open while traversing toward it.

Selection dispatches a bubbling, cancelable `menu.itemSelect` event. Preventing
it keeps the menu open. Checkbox/radio change notifications still run when
selection is canceled, matching upstream. Disabled items cannot select.
Checkboxes support `indeterminate`; indicators preserve Presence animation
behavior. Escape closes the menu tree. Modal content traps focus, blocks outside
pointers and scroll, and hides unrelated content from assistive technology;
nonmodal content dismisses on outside focus/pointer interactions.

## Improvements over the baseline

- Input modality, blur listeners, focus comparisons, custom events, sentinel
  leases and submenu timers use the relevant document/window, including iframes.
- Typeahead cycles through equal labels by element identity. Upstream filters
  out every item sharing the current label. Current DOM text is read when needed,
  so descendant label changes do not require a separate cached text update.
- Delayed typeahead cannot steal focus after a later interaction, select a
  disabled/removed item or run after unmount. Blur clears the search. IME
  composition does not select or search items.
- Disabling or unmounting a submenu trigger cancels pending hover opening.
  Pointer grace uses current submenu geometry and expires without a retained
  timeout. Completed/canceled pointer presses release their selection state.
- All dependencies are the independent VPM implementations, including their
  documented focus eligibility, dismissal, restoration and positioning fixes.

[Provenance](PROVENANCE.json) records the inspected upstream version and hashes.
The runtime was written independently; upstream is a behavioral control, not
vendored implementation code. Menu does not supply styling or a root trigger:
Dropdown Menu and other wrappers provide their trigger policy.

## Validation and performance

[Conformance fixtures](../../scripts/radix-menu-conformance/README.md) compare
React 19.1.0 and 19.2.4 on Node 24 and Bun, with server/client tests, hydration,
scoped contexts, selection/state, keyboard, nested menus, slots and cleanup.
Native Chrome checks real keyboard/mouse input, submenu geometry and pointer
grace, iframe modal ownership and unchanged Dropdown Menu 2.2.1 callers.
Clean archive consumers check npm/Bun installs, CJS/ESM identity, SSR and
TypeScript 7 DOM-only NodeNext/Bundler types. Local Bun validation used cached
packages and an npm-generated lock after registry DNS failures; default CI also
checks independent Bun resolution. A related stylesheet-helper
fix is covered by its own Bun production hook mount/cleanup regression.

[Measurements](bench/results/README.md) use isolated production bundles, balanced
process ordering, identical-code controls and retained samples. The workloads
are synthetic React/jsdom; they do not measure browser layout, deferred timer
latency or application-level performance. Node SSR took 58.4% less time and
unchanged renders 57.4% less in these runs, beyond the control spread in every
pair. Node canceled selection was inconclusive (+1.2% median). All Bun cases
were inconclusive: directions reversed across pairs, with large control spreads.
The nominal Bun selection increase was 17%; it is not an established regression. No Safari/Firefox or manual screen-reader
acceptance is claimed. This source package is not yet released or adopted by
VentiMath; the installed dependency family is recorded separately in the tree.
