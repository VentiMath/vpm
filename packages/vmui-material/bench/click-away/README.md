# Click-away event dispatch and server rendering

The mounted case dispatches three clicks in jsdom, inside the child, inside its React portal, and outside. The server cases render the two app-shaped boundaries using production React.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| App7 mounted event sequence (jsdom) | 39225 → 37606 | -3.3% † | 15742 → 14978 | -4.9% † |
| App7 search SSR | 1851 → 1678 | -9% | 1289 → 1320 | +2.2% † |
| App7 sidebar SSR | 1870 → 1763 | -5.7% | 1333 → 1316 | -1.2% † |
| Material9 mounted event sequence (jsdom) | 39247 → 37610 | -3.4% † | 16465 → 15378 | -7.4% † |
| Material9 search SSR | 1885 → 1688 | -10.3% | 1355 → 1330 | -3.2% † |
| Material9 sidebar SSR | 1866 → 1712 | -8.1% | 1406 → 1352 | -5.2% † |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
