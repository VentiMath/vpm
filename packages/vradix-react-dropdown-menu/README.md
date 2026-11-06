# vradix-react-dropdown-menu

Independent **@radix-ui/react-dropdown-menu 2.2.1** implementation for React 19.
Adds dropdown triggers and controlled/uncontrolled state to VPM Menu. Five direct
VPM dependencies form a 35-package closure; React and ReactDOM are peers.

```jsx
import * as Dropdown from 'vradix-react-dropdown-menu';

<Dropdown.Root>
  <Dropdown.Trigger>Actions</Dropdown.Trigger>
  <Dropdown.Portal>
    <Dropdown.Content sideOffset={4}>
      <Dropdown.Item onSelect={save}>Save</Dropdown.Item>
      <Dropdown.Item disabled>Unavailable</Dropdown.Item>
    </Dropdown.Content>
  </Dropdown.Portal>
</Dropdown.Root>
```

## Contract

Exports all named `DropdownMenu*` components and short aliases: Root, Trigger,
Portal, Content, Group, Label, Item, CheckboxItem, RadioGroup, RadioItem,
ItemIndicator, Separator, Arrow, Sub, SubTrigger and SubContent.
`createDropdownMenuScope` composes the Menu scope for wrapper libraries.

Root and Sub accept `open`, `defaultOpen` and `onOpenChange`. Root defaults to
modal behavior and supports `dir`. Trigger is a button by default, supports
`asChild`, disabled state and React 19 refs, and connects its expanded/control
attributes to the menu. Enter/Space toggle; ArrowDown opens and focuses the first
eligible item. Primary pointer press toggles, while right-click and Ctrl-click
leave the menu closed. Pointer entry focuses content until hover or keyboard
navigation. Caller handlers can prevent the default action.

Content exposes Menu placement, selection, outside-interaction and close-focus
behavior. Escape and item selection normally return focus to the trigger.
Nonmodal outside interactions and modal context clicks do not force focus back.
`onCloseAutoFocus` can cancel or replace that restoration. If overriding generated
IDs, also supply matching ARIA attributes. The five
`--radix-dropdown-menu-*` placement/size variables alias Popper's corresponding
variables on Content and SubContent; caller styles are preserved.

Portal supports custom containers. Content, Portal, SubContent and ItemIndicator
support `forceMount`. Checkbox/radio selection, indicators, LTR/RTL submenus,
typeahead, animation presence and scroll/modal behavior come from
[VPM Menu](../vradix-react-menu/README.md). Canceling selection keeps the menu
open while preserving checkbox/radio change notifications. Consumers supply
styling; this package does not provide a visual theme.

## Improvements and provenance

The runtime is independently written, with shared scope-forwarding for delegated
parts rather than vendored upstream runtime code. IME confirmation on a trigger
does not open the menu. Menu's document-owned modality handling also means
keyboard entry in an iframe focuses its first item; upstream 2.2.1 leaves focus
on the content. Both differences have paired upstream controls. Menu's documented
focus, typeahead, submenu timer and positioning improvements carry through.

[Provenance](PROVENANCE.json) records the baseline and inspected source hashes.
The installed VentiMath family currently comes through Amplify UI; a newer VPM
replacement counts as built for that family, not as an app migration. This
[release installation recipe](../../docs/INSTALLATION.md#radix-dropdown-menu)
provides the complete closure. VentiMath adoption remains a separate consumer
change; see the [adoption record](../../docs/ADOPTION.md).

## Verification

[Controls](../../scripts/radix-dropdown-menu-conformance/README.md) cover React
19.1.0 and 19.2.4 on Node 24 and Bun, SSR/hydration, scoped composition, state,
keyboard/pointer activation, cancellation, refs, selection and iframe focus.
Native Chrome additionally uses actual keyboard and mouse input. Packed consumers
check the entire VPM closure, npm/Bun installs, CJS/ESM identity, and TypeScript 7
DOM-only NodeNext/Bundler declarations. Safari/Firefox and manual screen-reader
acceptance have not been performed.

[Measurements](bench/results/README.md) use production bundles, isolated
processes, balanced order and identical-code controls. They measure synthetic
React/jsdom workloads, not browser layout or application-level performance.

In the recorded runs, closed-trigger SSR took 35.1% less time on Node and 21.1%
less on Bun; open 16-item SSR took 53.0%/32.4% less; unchanged open renders took
47.3%/35.2% less. Every rendering pair exceeded the identical-code control spread.
Canceled-selection medians were +4.4% on Node and +1.5% on Bun, with direction
reversals across pairs: neither difference is established at this precision.
