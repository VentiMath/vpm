# Academy course subtitles

The app control is Material 7.2.0. The sidebar has six keyed lessons with a title and subtitle. Its normal configuration keeps all six subtitles expanded. A second server case mounts only the active subtitle. The jsdom case changes the selected lesson and returns while retaining the subtitle elements. Chrome checks actual dimensions and clicks separately.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | All six Academy subtitles SSR | 397.036 | 332.923 | -16.9% | lower time in every pair, beyond control spread |
| Node 24 | One active subtitle SSR | 322.646 | 257.811 | -20.1% | lower time in every pair, beyond control spread |
| Node 24 | Mounted navigation with six expanded subtitles | 1165.133 | 928.657 | -18.6% | unestablished at this precision |
| Bun 1.4.4 | All six Academy subtitles SSR | 302.590 | 252.378 | -16.7% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | One active subtitle SSR | 247.971 | 195.496 | -21.4% | unestablished at this precision |
| Bun 1.4.4 | Mounted navigation with six expanded subtitles | 862.197 | 675.917 | -17.9% | unestablished at this precision |

Four comparison pairs alternate process order, with two identical-source pairs for the control. [Node samples](node24.json) · [Bun samples](bun.json)
