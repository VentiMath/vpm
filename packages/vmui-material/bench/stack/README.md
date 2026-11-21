# Contest Stack server rendering

Each sample renders eight three-link panels. The WARML case uses responsive flex gap, Math Is Cool uses sibling margins, and ARML uses a wrapping, center-aligned row. The Material 7 and VPM cases use the app’s direct layout props. Material 9 gets equivalent styles through sx.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Material9 arml Stack SSR | 115258 → 74915 | -35.3% | 55947 → 45340 | -19.1% † |
| Material9 warml Stack SSR | 116290 → 77464 | -33.4% | 63526 → 48773 | -23.9% |
| Material9 mic Stack SSR | 126421 → 76652 | -40.1% | 77083 → 47377 | -38.8% |
| App7 arml Stack SSR | 121193 → 76103 | -34.8% † | 74687 → 45568 | -39.7% |
| App7 warml Stack SSR | 122254 → 72633 | -40.9% | 82321 → 48380 | -40.5% |
| App7 mic Stack SSR | 140281 → 75144 | -47% | 90273 → 48384 | -46% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
