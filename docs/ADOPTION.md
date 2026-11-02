# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. This is dependency adoption, not proof that every
installed module reaches a production bundle or a deployed feature.

Verified November 2, 2026 against the application's main branch, commit
`8fcc5099` (styling migration: `245c1541`; calendar migration: `63f63f6a`):

| Package | In use | Available update |
| --- | --- | --- |
| `vfullcalendar-react` | `calendar-7.1.3`, package 7.1.3 | `calendar-7.1.3-r2`: independently written application-scope renderer |
| `vfullcalendar-core` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vfull-ui-headless-calendar` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vclsx`, `vstylis` and 13 Emotion packages | `styling-11.14.1` | Current published styling release |
| Five `vfloating-ui-*` packages and `vtabbable` | Not adopted | `floating-0.27.20-r2`: menu interaction fixes and pinned transitive URLs |

Evidence: the top-level calendar release URL in `package.json`, all three
resolved release archives in `bun.lock`, and v7 calendar imports in the app's
calendar view/header. The first calendar release contains an adapted React
renderer; its presence in the application does not imply that the new
independent renderer has already been adopted.

The app's styling migration pins all 15 release archives in `package.json` and
`bun.lock`, and Vite aliases clsx, Stylis and every Emotion import to those VPM
packages. Those 15 packages are now marked **in use**, bringing the total to 18.
This records committed consumption, not a separately verified deployment. `vmemoize-one`, `vuse-sync-external-store` and `vshallow-equal` are implemented
and tested, but not yet adopted.

The standalone progress tree uses a teal/blue/purple gradient and **IN USE** badge
for verified adoption. Green means available; yellow tracks partial work;
purple means made unnecessary; red means not started. Adoption and implementation
scope remain separately documented even when a row is collapsed.

The pending Floating UI cutover targets the Tiptap documentation editor example.
It is not yet adoption on main. Switching its three primitives does not replace
MUI/Radix's transitive Floating UI dependencies or establish production bundle
savings. The revised release is available for the application's own browser
comparison before that cutover lands.
