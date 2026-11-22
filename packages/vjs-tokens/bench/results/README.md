# Babel build diagnostics

One JSX excerpt scanned with a token-size checksum, followed by a complete ANSI code frame from the unchanged app control. The frame is constructed in the timed section. The consumer and its tokenizer are loaded before timing.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Tokenize a JSX error excerpt | 4.461 | 3.870 | -13.3% | lower time in every pair, beyond control spread |
| Node 24 | Babel colored build diagnostic | 11.828 | 11.126 | -5.7% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Tokenize a JSX error excerpt | 3.328 | 2.907 | -12.7% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Babel colored build diagnostic | 10.400 | 10.039 | -3.7% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
