import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build as bundle} from 'esbuild';
import {build} from 'vite';
const aliases = JSON.parse(fs.readFileSync('aliases.json'));
function checkModules(ids) {
  const original = ids.filter(id => /node_modules\/(?:@emotion\/|clsx\/|stylis\/)/.test(id));
  assert.deepEqual(original, [], 'Original styling modules must not enter the bundle');
  assert.ok(ids.some(id => /node_modules\/vemotion-react\//.test(id)));
  assert.ok(ids.some(id => /node_modules\/vclsx\//.test(id)));
}
const server = await bundle({entryPoints: ['ssr.mjs'], outfile: 'ssr-built.cjs', bundle: true,
  platform: 'node', format: 'cjs', alias: aliases, metafile: true, define: {'process.env.NODE_ENV': '"production"'}});
checkModules(Object.keys(server.metafile.inputs));
await build({configFile: false, logLevel: 'error', define: {'process.env.NODE_ENV': '"production"'}, resolve: {alias: aliases, dedupe: ['react', 'react-dom', 'vemotion-react', 'vemotion-cache']},
  esbuild: {jsx: 'automatic', jsxImportSource: '@emotion/react'},
  build: {minify: false, lib: {entry: 'browser.tsx', formats: ['es'], fileName: () => 'entry.mjs'},
    rollupOptions: {plugins: [{name: 'verify-styling-identity', generateBundle(_, output) {
      checkModules(Object.values(output).filter(chunk => chunk.type === 'chunk').flatMap(chunk => Object.keys(chunk.modules)));
    }}]}}});
