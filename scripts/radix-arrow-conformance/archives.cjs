'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-arrow-'));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120000, env: { ...process.env, BUN_INSTALL_CACHE_DIR: path.join(temp, 'bun-cache'), npm_config_cache: path.join(temp, 'npm-cache') } });
  assert.ifError(r.error); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout;
}
try {
  const archives = {};
  for (const name of ['vradix-react-compose-refs', 'vradix-react-slot', 'vradix-react-primitive', 'vradix-react-arrow']) {
    const dir = path.join(root, 'packages', name), meta = require(path.join(dir, 'package.json'));
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], dir);
    const file = path.join(temp, name + '-' + meta.version + '.tgz'); archives[name] = 'file:' + file;
    assert.doesNotMatch(run('tar', ['-tzf', file]), /\/(test|bench|node_modules)\//);
    const packed = JSON.parse(run('tar', ['-xOf', file, 'package/package.json']));
    assert(Object.values(packed.dependencies ?? {}).every(v => !v.startsWith('workspace:')));
  }
  for (const manager of ['npm', 'bun']) for (const react of ['19.1.0', '19.2.4']) {
    const cwd = path.join(temp, manager + '-' + react); fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { ...archives, react, 'react-dom': react, '@types/react': '19.2.14', '@radix-ui/react-popper': '1.4.0', '@radix-ui/react-arrow': '1.1.17' }, overrides: archives }));
    run(manager, ['install', '--ignore-scripts', ...(manager === 'npm' ? ['--no-audit', '--no-fund'] : [])], cwd);
    run(manager, manager === 'npm' ? ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] : ['install', '--frozen-lockfile', '--ignore-scripts'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.mjs'), `import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRequire} from 'node:module';import {Arrow,Root} from 'vradix-react-arrow';const c=createRequire(import.meta.url)('vradix-react-arrow');assert.equal(Arrow,Root);assert.equal(Arrow,c.Arrow);assert.equal(Root,c.Root);assert.equal(renderToString(React.createElement(Arrow)), '<svg width="10" height="5" viewBox="0 0 30 10" preserveAspectRatio="none"><polygon points="0,0 30,0 15,10"></polygon></svg>');const custom=renderToString(React.createElement(Arrow,{asChild:true},React.createElement('svg',{viewBox:'0 0 10 10'},React.createElement('path',{d:'M0 0L10 10'}))));assert(custom.includes('viewBox="0 0 10 10"'));assert(custom.includes('<path'));`);
    for (const runtime of ['node', 'bun']) run(runtime, ['consumer.mjs'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.tsx'), `import * as React from 'react';import {Arrow,Root,type ArrowProps} from 'vradix-react-arrow';const props:ArrowProps={width:'2em',height:5,asChild:false,viewBox:'0 0 30 10',onClick:e=>{const svg:SVGSVGElement=e.currentTarget;void svg;}};const node=<Arrow {...props} ref={React.createRef<SVGSVGElement>()}/>;const custom=<Root asChild ref={element=>{const svg:SVGSVGElement|null=element;return ()=>void svg;}}><svg><path d="M0 0L10 10"/></svg></Root>;void [node,custom];\n// @ts-expect-error arrow refs remain SVG-specific\nconst badRef=<Arrow ref={React.createRef<HTMLDivElement>()}/>;\n// @ts-expect-error width cannot be an object\nconst badWidth=<Arrow width={{value:2}}/>;`);
    for (const resolution of ['NodeNext', 'Bundler']) {
      fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, jsx: 'react-jsx', target: 'ES2022', module: resolution === 'Bundler' ? 'ESNext' : resolution, moduleResolution: resolution, lib: ['ES2022', 'DOM'], types: [] }, files: ['consumer.tsx'] }));
      run('node', [require('../platform-types.cjs').compiler().path, '-p', 'tsconfig.json'], cwd);
    }
    fs.copyFileSync(path.join(__dirname, 'browser-entry.mjs'), path.join(cwd, 'browser.mjs'));
    fs.writeFileSync(path.join(cwd, 'build.mjs'), `const variant=process.argv[2];const result=await Bun.build({entrypoints:['./browser.mjs'],outdir:'.',naming:'bundle.js',target:'browser',define:{'process.env.NODE_ENV':'"production"'},plugins:variant==='vpm'?[{name:'replace-arrow-only',setup(build){build.onResolve({filter:/^@radix-ui\\/react-arrow$/},()=>({path:import.meta.resolve('vradix-react-arrow').replace(/^file:\\/\\//,'')}));}}]:[]});if(!result.success)throw new AggregateError(result.logs);`);
    for (const variant of ['upstream', 'vpm']) {
      run('bun', ['build.mjs', variant], cwd);
      assert.doesNotMatch(fs.readFileSync(path.join(cwd, 'bundle.js'), 'utf8'), /require\(["']node:/);
      if (manager === 'npm') console.log(react, variant, run('node', [path.join(__dirname, 'browser.cjs'), cwd], cwd).trim());
    }
  }
  console.log('Exact four-package npm/Bun fresh/frozen installs, Node/Bun CJS/ESM SSR, TS7 DOM declarations and Chrome upstream/VPM Popper controls on React 19.1/19.2 pass.');
} finally { if (process.env.VPM_KEEP_FIXTURE === '1') console.log('Archive fixture retained:', temp); else fs.rmSync(temp, { recursive: true, force: true }); }
