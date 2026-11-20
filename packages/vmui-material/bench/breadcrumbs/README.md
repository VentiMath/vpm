# Breadcrumb server rendering

Each operation renders eight labelled navigation trails with VentiMath-shaped router links. A short trail shows all three links. A six-link trail shows the first and last links and a keyboard-accessible expansion button. These measurements use the default theme. Theme overrides and interactivity are checked separately in Chrome.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Material9 short Breadcrumbs SSR | 391817 → 490726 | +33.9% † | 215920 → 252685 | +12.2% |
| Material9 collapsed Breadcrumbs SSR | 533230 → 734501 | +42.5% † | 341818 → 410823 | +21.4% |
| App7 short Breadcrumbs SSR | 551205 → 452621 | -23.3% † | 287202 → 265415 | -7.6% † |
| App7 collapsed Breadcrumbs SSR | 640934 → 637069 | -0.6% † | 367885 → 416432 | +11.2% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
