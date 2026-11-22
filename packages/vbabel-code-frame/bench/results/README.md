# Babel error formatting

Independent formatter compared with the app’s code-frame 7.29.0. The same JSX excerpt is highlighted alone and formatted with plain or forced ANSI output. Source loading is outside timing.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Highlight a JSX diagnostic | 7.692 | 7.538 | -1.6% | unestablished at this precision |
| Node 24 | Plain source frame | 1.698 | 0.981 | -42.5% | lower time in every pair, beyond control spread |
| Node 24 | Colored source frame | 9.907 | 9.581 | -2.9% | unestablished at this precision |
| Bun 1.4.4 | Highlight a JSX diagnostic | 6.657 | 5.232 | -20.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Plain source frame | 1.295 | 0.904 | -30.6% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Colored source frame | 9.732 | 7.741 | -19.9% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
