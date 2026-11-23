# Public Material color lookups

The unchanged VentiMath `FuseUtils.randomMatColor` method reads the public
namespace. VPM uses direct properties instead of the control module's export
getters. These measurements cover warm module lookups, not theme assembly,
module startup, page rendering or an application speedup. The CSS-variable type
changes have no runtime cost.

| Runtime | Operation | Upstream ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Unchanged FuseUtils random color | 47 | 44 | -7.7% | lower time in every pair, beyond control spread |
| Node 24 | Named ramp lookup | 18 | 20 | +11.6% | unestablished at this precision |
| Bun 1.4.4 | Unchanged FuseUtils random color | 63 | 35 | -44.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Named ramp lookup | 6 | 7 | +4.1% | unestablished at this precision |

Four balanced isolated-process comparison pairs and two identical-source control
pairs; twelve rounds with warmup and validation outside timing. No trimming.
The single-color read differences are too small/noisy to establish a change.
Absolute savings on the app method are only a few to a few dozen nanoseconds.

[Node samples](node24.json) · [Bun samples](bun.json) ·
[Captured app method and source hash](../../../../scripts/mui-material-conformance/fixtures/color-caller.json)
