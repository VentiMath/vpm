# Generating source maps for Babel

The small case emits 40 mappings from the Babel printer. Full cases replay all 4,947 printer mappings or import the encoded map and enumerate its positions.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| small generated map | 3557 → 3780 | +5.7% | 4469 → 3436 | -21.4% |
| Babel printer decoded map | 196064 → 270316 | +34.7% † | 186257 → 171306 | -8% † |
| Babel printer encoded map | 247673 → 325512 | +31.4% | 289414 → 286469 | +0.2% † |
| import printer map and enumerate | 202576 → 357153 | +86.2% † | 224971 → 312322 | +39.3% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
