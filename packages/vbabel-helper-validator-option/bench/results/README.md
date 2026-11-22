# Babel option validation

Compare known option checks, a misspelled browser name, and the complete diagnostic through the unchanged compilation-targets 7.28.6 caller. Validator instances and consumers are created outside timing.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Validate known build options | 0.028 | 0.078 | +178.8% | higher time in every pair, beyond control spread |
| Node 24 | Suggest a mistyped browser target | 2.825 | 3.138 | +12.5% | higher time in every pair, beyond control spread |
| Node 24 | Compilation-targets diagnostic | 6.918 | 7.647 | +12.7% | unestablished at this precision |
| Bun 1.4.4 | Validate known build options | 0.023 | 0.096 | +317.4% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Suggest a mistyped browser target | 2.242 | 1.136 | -49.8% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Compilation-targets diagnostic | 3.176 | 1.923 | -39.8% | lower time in every pair, beyond control spread |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
