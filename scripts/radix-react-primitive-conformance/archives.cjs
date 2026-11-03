'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-radix-elements-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
  const archives={},dependencies={react:'19.2.4','react-dom':'19.2.4','@types/react':'19.2.14','@types/react-dom':'19.2.3'};
  for(const name of ['vradix-react-compose-refs','vradix-react-slot','vradix-react-primitive']) {
    const directory=path.join(root,'packages',name),metadata=require(path.join(directory,'package.json'));
    run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],directory);
    const archive=path.join(temp,name+'-'+metadata.version+'.tgz');archives[name]='file:'+archive;
    assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
    if(name==='vradix-react-primitive')assert.deepEqual(JSON.parse(run('tar',['-xOf',archive,'package/package.json'])).dependencies,{'vradix-react-slot':'1.5.0'});
  }
  for(const manager of ['npm','bun']) {
    const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{...dependencies,...archives},...(manager==='bun'?{overrides:archives}:{})}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import * as api from 'vradix-react-primitive';import {createRequire} from 'node:module';const c=createRequire(import.meta.url)('vradix-react-primitive');assert.equal(api.Primitive,c.Primitive);assert.equal(api.Root,c.Primitive);assert.equal(api.dispatchDiscreteCustomEvent,c.dispatchDiscreteCustomEvent);assert.equal(Object.keys(api.Primitive).length,17);assert.equal(renderToString(React.createElement(api.Primitive.button,{type:'button'},'native')),'<button type="button">native</button>');assert.equal(renderToString(React.createElement(api.Primitive.button,{asChild:true,className:'outer'},React.createElement('a',{href:'#link',className:'inner'},'link'))),'<a href="#link" class="outer inner">link</a>');let calls=0;assert.equal(api.dispatchDiscreteCustomEvent({dispatchEvent(){calls++;return false}},{}),undefined);assert.equal(calls,1);`);
    for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.tsx'),`import * as React from 'react';import {Primitive,Root,dispatchDiscreteCustomEvent,type PrimitivePropsWithRef} from 'vradix-react-primitive';const input=<Primitive.input ref={React.createRef<HTMLInputElement>()} value="value" onChange={e=>{const text:string=e.currentTarget.value;void text}}/>;const svg=<Primitive.svg ref={React.createRef<SVGSVGElement>()} viewBox="0 0 10 10"/>;const props:PrimitivePropsWithRef<'a'>={href:'#target',asChild:true};const node=<Root.a {...props}><a>child</a></Root.a>;const returned:void=dispatchDiscreteCustomEvent(document.body,new CustomEvent<{id:number}>('custom',{detail:{id:1}}));void [input,svg,node,returned];\n// @ts-expect-error the button ref remains element-specific\nconst badRef=<Primitive.button ref={React.createRef<HTMLDivElement>()}/>;\n// @ts-expect-error only the documented tags exist\nconst unknown=<Primitive.canvas/>;\n// @ts-expect-error generic Event is not a CustomEvent\ndispatchDiscreteCustomEvent(null,new Event('generic'));`);
    for(const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,jsx:'react-jsx',target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.tsx']}));
      run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
    }
    fs.writeFileSync(path.join(cwd,'browser.js'),`import {createElement} from 'react';import {Primitive,dispatchDiscreteCustomEvent} from 'vradix-react-primitive';export {dispatchDiscreteCustomEvent};export function Button(props){return createElement(Primitive.button,props)}`);
    run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
    assert.doesNotMatch(fs.readFileSync(path.join(cwd,'bundle.js'),'utf8'),/require\(["'](?:node:|fs["']|path["'])/);
  }
  console.log('Three-package clean npm/Bun closure: Node/Bun CJS/ESM, native/asChild SSR, event dispatch, TS7 DOM-only declarations and browser bundle pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
