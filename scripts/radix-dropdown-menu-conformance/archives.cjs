'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-dropdown-menu-'));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 180000, env: { ...process.env, BUN_INSTALL_CACHE_DIR: process.env.VPM_ARCHIVE_BUN_CACHE || path.join(temp, 'bun-cache'), npm_config_cache: process.env.VPM_ARCHIVE_NPM_CACHE || path.join(temp, 'npm-cache') } });
  if (r.error) throw Error(cmd + ': ' + r.error.message + '\n' + r.stdout + r.stderr); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout;
}
try {
  const archives = {};
  function pack(name) {
    if (archives[name]) return;
    const dir = path.join(root, 'packages', name), meta = require(path.join(dir, 'package.json'));
    for (const child of Object.keys(meta.dependencies || {})) pack(child);
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], dir);
    const file = path.join(temp, name + '-' + meta.version + '.tgz'); archives[name] = 'file:' + file;
    assert.doesNotMatch(run('tar', ['-tzf', file]), /\/(test|bench|node_modules)\//);
    const packed = JSON.parse(run('tar', ['-xOf', file, 'package/package.json']));
    assert(Object.values(packed.dependencies || {}).every(value => !value.startsWith('workspace:')));
  }
  pack('vradix-react-dropdown-menu');
  for (const manager of ['npm', 'bun']) for (const react of ['19.1.0', '19.2.4']) {
    const cwd = path.join(temp, manager + '-' + react); fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
      ...archives, react, 'react-dom': react, '@types/react': '19.2.14', ...(manager === 'npm' ? { '@radix-ui/react-menu': '2.2.1', '@radix-ui/react-dropdown-menu': '2.2.1' } : {}),
    }, overrides: archives }));
    if (manager === 'bun' && process.env.VPM_ARCHIVE_OFFLINE) run('npm', ['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--offline'], cwd);
    run(manager, ['install', '--ignore-scripts', ...(manager === 'npm' ? ['--no-audit', '--no-fund'] : [process.env.VPM_ARCHIVE_OFFLINE ? '--offline' : '--prefer-offline'])], cwd);
    run(manager, manager === 'npm' ? ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] : ['install', '--frozen-lockfile', '--ignore-scripts'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.mjs'), `import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRequire} from 'node:module';import * as P from 'vradix-react-dropdown-menu';assert.equal(createRequire(import.meta.url)('vradix-react-dropdown-menu').Root,P.Root);assert.equal(P.DropdownMenu,P.Root);const html=renderToString(React.createElement(P.Root,{open:true,modal:false},React.createElement(P.Content,null,React.createElement(P.Item,null,'item'))));assert.match(html,/role="menuitem"/);assert.equal(renderToString(React.createElement(P.Root,null,React.createElement(P.Content,null,'hidden'))),'');`);
    for (const runtime of ['node', 'bun']) run(runtime, ['consumer.mjs'], cwd);
    fs.writeFileSync(path.join(cwd, 'consumer.tsx'), `import * as React from 'react';import * as P from 'vradix-react-dropdown-menu';const content:P.DropdownMenuContentProps={loop:true,side:'bottom',onCloseAutoFocus:e=>e.preventDefault(),onEscapeKeyDown:e=>{const k:KeyboardEvent=e;},onPointerDownOutside:e=>{const p:PointerEvent=e.detail.originalEvent;}};const tree=<P.Root open dir="rtl" onOpenChange={open=>{const b:boolean=open;}}><P.Trigger asChild><button/></P.Trigger><P.Portal container={document.body}><P.Content {...content} ref={React.createRef<HTMLDivElement>()}><P.Label>label</P.Label><P.Group><P.Item textValue="item" onSelect={e=>{const n:Event=e;e.preventDefault();}}>item</P.Item></P.Group><P.CheckboxItem checked="indeterminate" onCheckedChange={checked=>{const b:boolean=checked;}}><P.ItemIndicator/></P.CheckboxItem><P.RadioGroup value="one" onValueChange={value=>{const s:string=value;}}><P.RadioItem value="one"/></P.RadioGroup><P.Sub><P.SubTrigger>more</P.SubTrigger><P.SubContent align="end"/></P.Sub><P.Separator/><P.Arrow ref={React.createRef<SVGSVGElement>()}/></P.Content></P.Portal></P.Root>;
// @ts-expect-error invalid checked state
const badChecked=<P.CheckboxItem checked="mixed"/>;
// @ts-expect-error submenu has only start/end alignment
const badAlign=<P.SubContent align="center"/>;
// @ts-expect-error radio item requires a value
const badRadio=<P.RadioItem/>;
// @ts-expect-error forceMount only accepts true
const badMount=<P.Content forceMount={false}/>;
// @ts-expect-error caller chooses sub side through direction
const badSide=<P.SubContent side="bottom"/>;void tree;`);
    for (const resolution of ['NodeNext', 'Bundler']) {
      fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, exactOptionalPropertyTypes: true, noEmit: true, jsx: 'react-jsx', target: 'ES2022', module: resolution === 'Bundler' ? 'ESNext' : resolution, moduleResolution: resolution, lib: ['ES2022', 'DOM'], types: [] }, files: ['consumer.tsx'] }));
      run('node', [require('../platform-types.cjs').compiler().path, '-p', 'tsconfig.json'], cwd);
    }
    if (manager === 'npm') {
    for (const file of ['browser-entry.mjs','checks.mjs']) fs.copyFileSync(path.join(__dirname, file), path.join(cwd, file));
    run('bun', [path.join(__dirname, 'build.cjs'), cwd, cwd], cwd);
      for (const variant of ['upstream', 'vpm']) console.log(react, run('node', [path.join(__dirname, 'browser.cjs'), cwd, variant], cwd).trim());

    }
  }
  console.log((process.env.VPM_ARCHIVE_OFFLINE ? 'Offline cache with npm-to-Bun lock migration. ' : '') + Object.keys(archives).length + '-package closure: npm/Bun fresh/frozen installs, Node/Bun CJS/ESM SSR, TS7 exact DOM types and Chrome upstream/VPM caller comparisons pass.');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
