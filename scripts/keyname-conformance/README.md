# Keyboard-name compatibility

Pins `w3c-keyname` 2.2.8 and `prosemirror-keymap` 1.2.3, matching both current
releases and VentiMath's installed versions. Upstream publishes no test script;
original differential contracts cover its observable API rather than copying its
runtime into VPM. Package provenance records the upstream source hashes.

```sh
npm --prefix scripts/keyname-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/keyname-conformance/run.cjs
node scripts/keyname-conformance/archives.cjs
```

Node 24 and Bun 1.4.4 each run six groups with 430,080 platform/key/code/modifier
comparisons, mutable table parity, composition/international keys, missing and
unknown codes, Mac exclusions, prototype-name inputs and getter-read behavior.
The 138 real keymap plugin cases cover six platform environments, modifier
fallbacks, legacy aliases and Windows AltGraph behavior. The keymap implementation
is unchanged upstream code installed only in the private fixture.

Archive checks verify exact packed bytes and exclude tests, benchmarks and fixture
dependencies. Fresh and frozen npm/Bun consumers run the contracts and keymap
callers, verify CJS/ESM identity and compile public declarations under TS7 NodeNext
and Bundler modes. Chrome builds the installed package into the same real Tiptap
2.11.7 control editor with only key-name resolution changed: twelve native event
cases and trusted Enter/Backspace/Mod-b dispatches must agree. Keymaps, editor view,
IME and physical operating-system keyboard layouts are separate implementation
and application-acceptance work.

[Measurements](../../packages/vw3c-keyname/bench/results/README.md) use isolated
processes and retain raw samples, source hashes and inconclusive comparisons.
Platform-specific cases load both implementations in CommonJS function scope,
so upstream module variables are not accidentally measured through a VM global
proxy. The normal cases use the packages through their regular CommonJS entries.
