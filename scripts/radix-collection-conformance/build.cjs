'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function build({ browser = false, destination, consumer = __dirname } = {}) {
  const snapshot = browser ? null : require('./sources.cjs').sources();
  for (const variant of ['upstream', 'vpm']) {
    const entry = browser ? path.join(consumer, 'browser-entry.mjs') : path.join(__dirname, 'entry.mjs');
    const result = await Bun.build({
      entrypoints: [entry], target: browser ? 'browser' : 'node', format: browser ? 'esm' : 'cjs',
      define: browser ? { 'process.env.NODE_ENV': '"production"' } : {},
      plugins: [{ name: 'selected Collection and React peers', setup(b) {
        if (variant === 'vpm') b.onResolve({ filter: /^@radix-ui\/react-collection$/ }, () => ({ path: consumer === __dirname ? path.join(root, 'packages/vradix-react-collection/index.mjs') : require.resolve('vradix-react-collection', { paths: [consumer] }) }));
        if (consumer === __dirname) b.onResolve({ filter: /^v(?:radix-|floating-ui-)/ }, ({ path: specifier }) => {
          const [name, ...subpath] = specifier.split('/'), folder = path.join(root, 'packages', name);
          const meta = require(path.join(folder, 'package.json'));
          if (!subpath.length) return { path: path.join(folder, meta.module || meta.main) };
          const exp = meta.exports['./' + subpath.join('/')];
          return { path: path.join(folder, typeof exp === 'string' ? exp : typeof exp.import === 'string' ? exp.import : exp.import.default) };
        });
        b.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, ({ path: specifier }) => browser
          ? { path: require.resolve(specifier, { paths: [consumer] }) }
          : { path: specifier, external: true });
      } }],
    });
    if (!result.success) throw new Error(result.logs.join('\n'));
    if (browser) { await Bun.write(path.join(destination, variant + '.mjs'), result.outputs[0]); continue; }
    for (const version of ['', 'current/']) {
      const output = path.join(__dirname, version, 'node_modules/.vpm-collection', variant + '.cjs');
      fs.mkdirSync(path.dirname(output), { recursive: true }); await Bun.write(output, result.outputs[0]);
    }
  }
  if (!browser) {
    const { sources, hash } = require('./sources.cjs');
    require('node:assert/strict').deepEqual(sources(), snapshot, 'Source changed during fixture build');
    for (const version of ['', 'current/']) {
      const folder = path.join(__dirname, version, 'node_modules/.vpm-collection');
      const bundles = Object.fromEntries(['upstream', 'vpm'].map(name => [name, hash(path.join(folder, name + '.cjs'))]));
      fs.writeFileSync(path.join(folder, 'sources.json'), JSON.stringify({ sources: snapshot, bundles }));
    }
  }
}
module.exports = build;
if (require.main === module) build(process.argv[2] ? { browser: true, destination: process.argv[2], consumer: process.argv[3] || __dirname } : {}).catch(e => { console.error(e); process.exitCode = 1; });
