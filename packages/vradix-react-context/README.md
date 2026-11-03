# vradix-react-context

Independently written `createContext` and `createContextScope`, matching
**@radix-ui/react-context 1.3.0** on React 19. The package has no runtime
dependencies beyond its React peer. CJS and ESM share the same exports.

Providers, default and optional reads, missing-provider errors, nested scopes,
dependency composition and scope overrides retain the current contract. The
app's 1.1.2 baseline is also checked for the APIs it supports.

## Improvements

- Provider memoization compares field names as well as values. Changing `{a: 1}`
  to `{b: 1}` no longer leaves consumers with `{a: 1}`. Adding/removing fields
  does not change a React hook dependency-array length.
- Composed scopes retain identity when the context record is unchanged, avoiding
  upstream's new merged object on every render.
- Context registration appends definitions to one private list instead of
  copying the growing list for every registration.

[Tests](../../scripts/radix-context-conformance/README.md) run original/VPM
controls, actual unchanged ToggleGroup callers, updates and hydration, plus fresh
npm/Bun archives, TypeScript 7 and browser bundling. Paired controls demonstrate
both the stale-field bug and scope-identity churn in upstream.

[Isolated benchmarks](bench/results/README.md) measure construction and development
SSR on Node 24 and Bun. These are not browser or application performance claims.

Built, not released or adopted by VentiMath. The independent implementation was
informed by upstream's API and source; [provenance](PROVENANCE.json) records the
reference and MIT attribution. No clean-room claim is made.

Factory construction takes 95.1% less time on Node 24 and 76.3% less on Bun;
creating a 16-context scope takes 90.4% and 63.6% less, respectively, beyond
identical-code controls. Provider/consumer SSR directions are inconclusive on
both runtimes. These are construction/renderer microbenchmarks, not app speedups.
