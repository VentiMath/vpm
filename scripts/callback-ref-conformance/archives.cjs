'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-callback-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout}
try{
 run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vuse-callback-ref'));
 const archive=path.join(temp,'vuse-callback-ref-1.3.3.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{'vuse-callback-ref':'file:'+archive,react:'19.1.0','react-dom':'19.1.0','@types/react':'19.2.10','@types/react-dom':'19.2.3'}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  const source="const React=require('react'),{renderToString}=require('react-dom/server'),api=require('vuse-callback-ref');function App(){return React.createElement('div',{ref:api.useMergeRefs([React.useRef(null)])},'ok')}if(renderToString(React.createElement(App))!=='<div>ok</div>')throw Error('SSR');";
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),source);fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import {createRequire} from 'node:module';import {useMergeRefs} from 'vuse-callback-ref';const require=createRequire(import.meta.url);if(useMergeRefs!==require('vuse-callback-ref').useMergeRefs)throw Error('identity');"+source);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  fs.writeFileSync(path.join(cwd,'browser.mjs'),"import {mergeRefs,assignRef} from 'vuse-callback-ref';const a={current:null},b={current:null};const ref=mergeRefs([a,b]);assignRef(ref,5);if(a.current!==5||b.current!==5)throw Error('refs');");
  const bundle=require('esbuild').buildSync({entryPoints:[path.join(cwd,'browser.mjs')],bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}});vm.runInNewContext(bundle.outputFiles[0].text,{});
  fs.copyFileSync(path.join(__dirname,'consumer.tsx'),path.join(cwd,'consumer.tsx'));
  // JSX is compiled in a TSX consumer; CJS/ESM runtime identity is checked above.
  for(const mode of ['NodeNext','Bundler']){
   fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],jsx:'react-jsx',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode},files:['consumer.tsx']}));
   run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
  }
 }
 console.log('Packed callback refs: npm/Bun installs, Node/Bun CJS/ESM identity and SSR, standalone browser bundle and strict TS7 JSX consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
