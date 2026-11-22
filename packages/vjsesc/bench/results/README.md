# Babel literal printing

The control is jsesc 3.1.0. Each string uses the options Babel supplies for a generated string literal. The numeric case prints an integer in hexadecimal. The benchmark times the literal printer independently of parsing and source-map generation.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Short ASCII label | 0.121 | 0.082 | -31.9% | lower time in every pair, beyond control spread |
| Node 24 | Multilingual literal | 1.975 | 1.465 | -25.4% | lower time in every pair, beyond control spread |
| Node 24 | Long mixed literal | 64.511 | 43.395 | -32.6% | lower time in every pair, beyond control spread |
| Node 24 | Hexadecimal number | 0.118 | 0.054 | -54.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Short ASCII label | 0.114 | 0.052 | -54.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Multilingual literal | 1.678 | 1.428 | -15.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Long mixed literal | 55.321 | 42.158 | -23.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Hexadecimal number | 0.119 | 0.043 | -64.7% | lower time in every pair, beyond control spread |

Four comparison pairs alternate process order, with two identical-source pairs for the control. [Node samples](node24.json) · [Bun samples](bun.json)
