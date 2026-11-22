# vgensync

Babel Core uses generators to share its configuration loading and file transforms across synchronous calls, promises and Node-style callbacks. This independent implementation targets `gensync` 1.0.0-beta.2 and has no runtime dependencies.

```js
import gensync from "vgensync";
import {readFile, readFileSync} from "node:fs";

const read = gensync({sync: readFileSync, errback: readFile});
const load = gensync(function* (file) {
  return JSON.parse(yield* read(file, "utf8"));
});

const current = load.sync("config.json");
const next = await load.async("config.json");
```

Operations retain the caller’s receiver and interoperate with the upstream generator protocol. Immediate callbacks complete in the same turn. The runner walks consecutive immediate operations iteratively. Once an operation settles, a duplicate callback or a subsequent throw from that handler cannot replace the first result.

`all` returns results in input order. In synchronous mode `race` evaluates the first operation. In asynchronous mode it starts the participants and forwards the first outcome. Babel Core 7.29.0 conformance checks exercise config discovery, JSX builds with source maps, async plugins and file errors from packed installs. [Build and generator measurements](bench/results/README.md).
