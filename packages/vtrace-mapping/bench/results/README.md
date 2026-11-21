# Source-map tracing on the Babel printer

The input is the installed Babel printer map with 780 generated lines and 4,947 segments. Cold operations create a new tracer each time. Warm operations reuse a decoded tracer.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| construct and first lookup | 117607 → 166996 | +42.9% | 115066 → 202404 | +76% |
| warm repeated lookup | 17 → 14 | -11.9% | 13 → 7 | -49.5% † |
| 64 warm forward lookups | 1251 → 941 | -24.9% | 1427 → 1189 | -15.9% † |
| gen-mapping decoded import | 182833 → 210676 | +12.5% † | 103114 → 190829 | +85.1% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
