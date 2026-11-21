# vresolve-uri

Resolves source-map references against a map URL. The default export is a function in both CommonJS and ES modules and has no runtime dependencies.

```js
import resolve from "vresolve-uri";

resolve("../src/app.ts", "https://example.org/assets/app.js.map");
// "https://example.org/src/app.ts"
```

The compatibility target is `@jridgewell/resolve-uri` 3.1.3. Relative maps can stay relative. Queries and fragments retain their spelling, including embedded slashes. File URLs, virtual schemes such as `webpack:///`, and bracketed IPv6 hosts work as source locations. This API is for locating source files. It performs no URL validation or network requests.

[Benchmark results](bench/results/README.md) · [Implementation provenance](PROVENANCE.json)
