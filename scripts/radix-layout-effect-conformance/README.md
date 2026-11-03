# Radix layout-effect conformance

Pinned `@radix-ui/react-use-layout-effect` 1.1.4 is the current contract. Runtime
and declaration hashes are recorded in the package provenance. Both versions
run the same SSR and JSDOM React 19 mount/update/unmount and Strict Mode controls.
The unchanged `@radix-ui/react-use-callback-ref` 1.1.5 caller runs with only its
leaf import redirected, verifying stable callbacks see the latest committed value.

`archives.cjs` packs the package, installs it in clean npm and Bun projects,
and checks Node/Bun CJS/ESM, TypeScript 7 NodeNext/Bundler with DOM-only types,
and a browser bundle. Tests are included in the normal root suite and CI.

```sh
npm --prefix scripts/radix-layout-effect-conformance ci --ignore-scripts
node --test packages/vradix-react-use-layout-effect/test/*.cjs
bun test packages/vradix-react-use-layout-effect/test
node scripts/radix-layout-effect-conformance/archives.cjs
```

A preliminary Node benchmark overlapped archive installation and was discarded
before recording the published isolated run. The published Node controls still
show substantial process noise; no performance direction is claimed.
