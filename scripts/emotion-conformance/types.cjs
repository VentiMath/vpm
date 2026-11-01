'use strict';
// Declarations of the browser packages in the Emotion family, as an
// application sees them, compiled against the originals and VPM's packages
// with DOM types under TypeScript 7.1 and the 5.8 and 5.9 compilers
// downstream projects use (strict, bundler resolution, library checks on).
// Each consumer covers the packages VPM provides so far.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {compile, compiler} = require('../platform-types.cjs');
const modules = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
const legacy = path.resolve(__dirname, '../legacy-typescript/node_modules');
const compilers = {[compiler().version]: compiler().path};
for (const name of ['typescript-5.8', 'typescript-5.9']) {
  const metadata = require(path.join(legacy, name, 'package.json'));
  compilers[metadata.version] = path.join(legacy, name, metadata.bin.tsc);
}

// Consumers by package; `@emotion/x` becomes `vemotion-x` for VPM.
const consumers = {
  sheet: `import { StyleSheet, type Options } from '@emotion/sheet';
const options: Options = { key: 'css', container: document.head, nonce: 'n', insertionPoint: document.createElement('meta') };
class Layered extends StyleSheet {
  insert(rule: string): void { this.before = document.head.firstElementChild; super.insert(rule); }
}
const sheet = new Layered(options);
sheet.insert('.a{color:red;}');
sheet.hydrate(Array.from(document.querySelectorAll<HTMLStyleElement>('style[data-emotion]')));
const tags: HTMLStyleElement[] = sheet.tags;
const speedy: boolean = sheet.isSpeedy;
sheet.flush();
// @ts-expect-error key is required
new StyleSheet({ container: document.head });
export { tags, speedy };
`,
  utils: `import { getRegisteredStyles, insertStyles, registerStyles, type EmotionCache, type SerializedStyles, type RegisteredCache } from '@emotion/utils';
declare const cache: EmotionCache;
const serialized: SerializedStyles = { name: 'abc', styles: 'color:red;', next: { name: 'k', styles: '@keyframes k{}' } };
const registered: RegisteredCache = cache.registered;
const styles: string[] = [];
const raw: string = getRegisteredStyles(registered, styles, 'css-abc other');
registerStyles(cache, serialized, false);
const css: string | undefined = insertStyles(cache, serialized, true);
cache.insert('.css-abc', serialized, cache.sheet, true);
export { raw, css };
`,
};
const available = Object.keys(consumers).filter(name => fs.existsSync(path.join(packages, 'vemotion-' + name)));

const results = {};
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emotion-types-'));
try {
  for (const library of ['upstream', 'vpm']) {
    const root = path.join(directory, library), nodeModules = path.join(root, 'node_modules');
    fs.mkdirSync(path.join(nodeModules, '@emotion'), {recursive: true});
    if (library === 'upstream') {
      for (const name of fs.readdirSync(path.join(modules, '@emotion'))) fs.symlinkSync(path.join(modules, '@emotion', name), path.join(nodeModules, '@emotion', name), 'dir');
    } else {
      for (const name of fs.readdirSync(packages).filter(name => name.startsWith('vemotion-') || name === 'vstylis')) fs.symlinkSync(path.join(packages, name), path.join(nodeModules, name), 'dir');
    }
    const files = available.map(name => {
      const file = path.join(root, name + '.ts');
      fs.writeFileSync(file, library === 'vpm' ? consumers[name].replace(/'@emotion\/([a-z-]+)'/g, "'vemotion-$1'") : consumers[name]);
      return file;
    });
    for (const [version, tsc] of Object.entries(compilers)) {
      const result = compile({files, compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext',
        moduleResolution: 'Bundler', types: [], preserveSymlinks: true, skipLibCheck: false}}, tsc);
      results[`${library} ${version}`] = result.output.split('\n').filter(line => /error TS/.test(line)).map(line => line.replace(directory, '').slice(0, 300));
    }
  }
} finally {
  fs.rmSync(directory, {recursive: true, force: true});
}
for (const [run, errors] of Object.entries(results)) assert.deepEqual(errors, [], run);
console.log(`Declarations of ${available.map(name => '@emotion/' + name).join(', ')} and VPM's ${available.map(name => 'vemotion-' + name).join(', ')}: an application compiles against each with DOM types under TypeScript ${Object.keys(compilers).join(', ')}.`);
