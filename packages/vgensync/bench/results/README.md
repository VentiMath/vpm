# Babel generator and file builds

The control is gensync 1.0.0-beta.2. The generator cases delegate four calls. File builds run unchanged Babel Core 7.29.0 on a JSX file, load a project configuration, rename a binding and generate a source map. Both implementations run from isolated Babel installs. Timings measure repeated builds after module loading.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Delegated sync generator | 0.332 | 0.352 | +4.5% | unestablished at this precision |
| Node 24 | Delegated async generator | 0.759 | 0.818 | +6.2% | unestablished at this precision |
| Node 24 | Babel JSX file sync build | 154.317 | 161.888 | +5.4% | unestablished at this precision |
| Node 24 | Babel JSX file async build | 202.044 | 192.388 | -11.3% | unestablished at this precision |
| Bun 1.4.4 | Delegated sync generator | 0.261 | 0.284 | +9.1% | unestablished at this precision |
| Bun 1.4.4 | Delegated async generator | 0.626 | 0.622 | -0.7% | unestablished at this precision |
| Bun 1.4.4 | Babel JSX file sync build | 105.888 | 96.596 | -10.8% | unestablished at this precision |
| Bun 1.4.4 | Babel JSX file async build | 123.907 | 131.016 | +7.0% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
