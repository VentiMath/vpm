# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. It does not by itself verify a deployment.

Verified November 1, 2026 against the application's main branch, commit
`aa5a96d4` (calendar migration: `63f63f6a`):

| Package | In use | Available update |
| --- | --- | --- |
| `vfullcalendar-react` | `calendar-7.1.3`, package 7.1.3 | `calendar-7.1.3-r2`: independently written application-scope renderer |
| `vfullcalendar-core` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vfull-ui-headless-calendar` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |

Evidence: the top-level calendar release URL in `package.json`, all three
resolved release archives in `bun.lock`, and v7 calendar imports in the app's
calendar view/header. The first calendar release contains an adapted React
renderer; its presence in the application does not imply that the new
independent renderer has already been adopted.

The styling release makes `vclsx` and Emotion replacements available. The checked
application revision still resolves their upstream packages, so they are not
marked in use. `vmemoize-one` is implemented and tested, but not yet adopted.

The standalone progress tree uses a teal/blue/purple gradient and **IN USE** badge
for verified adoption. Green means available; yellow tracks partial work;
purple means made unnecessary; red means not started. Adoption and implementation
scope remain separately documented even when a row is collapsed.
