# vsource-map-js

An independent implementation of the source-map-js 1.2.4 operations used by PostCSS 8.5.8 and CSS Tree 3.2.1. It has zero runtime dependencies. The app pins source-map-js 1.2.1. Both versions serve as comparison controls.

Import `SourceMapGenerator` and `SourceMapConsumer` from the package root using ESM or CommonJS. The generator also supports CSS Tree's `lib/source-map-generator.js` import. It snapshots generated and original coordinates on insertion, preserves embedded source text, and emits flat version 3 maps. The consumer scans the encoded mapping string once, validates every segment on first use, then looks up positions by generated line and column. PostCSS can chain a previous map and report a diagnostic against the original stylesheet.

The verified scope covers flat maps, generated-order iteration, both lookup biases, previous-map composition and the CSS callers. Indexed maps, SourceNode and reverse queries remain outside this scope. Adoption in the app is pending.

[Caller checks](../../scripts/source-map-conformance/README.md) · [Measurements](bench/results/README.md) · [Provenance](PROVENANCE.json)
