'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-slot-archives-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
  const dependencies={react:'19.2.4','react-dom':'19.2.4','@types/react':'19.2.14'};
  for(const name of ['vradix-react-compose-refs','vradix-react-slot']) {
    const directory=path.join(root,'packages',name),metadata=require(path.join(directory,'package.json'));
    run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],directory);
    const archive=path.join(temp,name+'-'+metadata.version+'.tgz');dependencies[name]='file:'+archive;
    assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
    if(name==='vradix-react-slot')assert.deepEqual(JSON.parse(run('tar',['-xOf',archive,'package/package.json'])).dependencies,{'vradix-react-compose-refs':'1.1.5'});
  }
  for(const manager of ['npm','bun']) {
    const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies,...(manager==='bun'?{overrides:{'vradix-react-compose-refs':dependencies['vradix-react-compose-refs']}}:{})}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import * as slot from 'vradix-react-slot';import {createRequire} from 'node:module';const c=createRequire(import.meta.url)('vradix-react-slot');for(const key of Object.keys(c))assert.equal(slot[key],c[key]);assert.equal(slot.Root,slot.Slot);assert.equal(renderToString(React.createElement(slot.Slot,{className:'outer'},React.createElement('button',{className:'inner'},'child'))),'<button class="outer inner">child</button>');`);
    for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.tsx'),`import * as React from 'react';import {Slot,Root,Slottable,createSlot,createSlottable,type SlotProps} from 'vradix-react-slot';const ref=React.createRef<HTMLButtonElement>();const Button=createSlot<HTMLButtonElement,React.ComponentPropsWithoutRef<'button'>&{variant:'solid'}>('Button');const marker=createSlottable('Marker');const node=<Button ref={ref} variant="solid" disabled><button>text</button></Button>;const plain=<Slot className="outer"><button/></Slot>;const wrapped=<Slottable child={<button/>}>{content=><span>{content}</span>}</Slottable>;const props:SlotProps<HTMLButtonElement,{kind:'button'}>={kind:'button',children:node};void [node,plain,wrapped,props,Root,marker];\n// @ts-expect-error custom props remain required\nconst missing=<Button><button/></Button>;\n// @ts-expect-error incorrect element ref\nconst wrong=<Button variant="solid" ref={React.createRef<HTMLDivElement>()}/>;\n// @ts-expect-error a render-prop child requires a function\nconst invalid=<Slottable child={<button/>}>text</Slottable>;`);
    for(const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,jsx:'react-jsx',target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.tsx']}));
      run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
    }
    fs.writeFileSync(path.join(cwd,'browser.js'),`import {createElement} from 'react';import {Slot,Slottable} from 'vradix-react-slot';export function Button({children,...props}){return createElement(Slot,props,createElement(Slottable,null,children))}`);
    run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
    assert.doesNotMatch(fs.readFileSync(path.join(cwd,'bundle.js'),'utf8'),/require\(["'](?:node:|fs["']|path["'])/);
  }
  console.log('Slot clean npm/Bun closure: Node/Bun CJS/ESM, SSR, TypeScript 7 NodeNext/Bundler and browser bundle pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
