# Floating UI DOM conformance

The pinned control is **@floating-ui/dom 1.8.0**, with core 1.8.0 and utils
0.2.12. [Package provenance](../../packages/vfloating-ui-dom/PROVENANCE.json)
records source attribution and the implementation boundary.

```sh
npm --prefix scripts/floating-dom-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vfloating-ui-dom/test/dom.test.cjs
bun test packages/vfloating-ui-dom scripts/floating-dom-conformance
node scripts/floating-dom-conformance/browser.cjs
node scripts/floating-dom-conformance/archives.cjs
```

The browser runner requires Chrome (`CHROME_BIN` may select it). It compares
144 app positioning cases and 319 geometry/viewport cases using the complete
upstream stack versus the complete VPM stack. It covers scales, scroll, RTL,
fixed positioning, table/SVG elements, shadow roots, virtual references, iframes,
top layers and all root-boundary forms. Two real observer resize/cleanup controls
run as well. Six retained upstream tests run with unchanged assertions; their
hashes are verified before bundling. Import aliases and a small assertion/hook
runner replace Vitest without changing those tests. Other upstream functional
and viewport-mocking tests are not claimed as executed.

The deterministic Node/Bun environment controls observer queues and frame
scheduling. Paired probes reproduce shared-listener cleanup, late observer
notifications and setup-exception leaks in the original. The VPM controls also
cover direct clipping, inherited platforms, ordinary geometry and module identity.

Archive checks install all three VPM packages from local tarballs, with explicit
overrides for transitive local packages. npm uses offline mode. Both module
systems, browser bundling and external TypeScript 7 consumers are checked.

Benchmarks use that controlled environment in isolated workers. Observer and
geometry objects are synthetic; browser performance must be measured separately.
