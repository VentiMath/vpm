'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-react-dom-archives-'));
function run(command,args,cwd=temp){const r=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
try {
 const dependencies={};
 for(const name of ['vfloating-ui-utils','vfloating-ui-core','vfloating-ui-dom','vfloating-ui-react-dom','react','react-dom','scheduler','@types/react','@types/react-dom','csstype','@floating-ui/react-dom','@floating-ui/dom','@floating-ui/core','@floating-ui/utils']){
  const dir=path.join(name.startsWith('v')?root+'/packages':__dirname+'/node_modules',name),meta=JSON.parse(fs.readFileSync(path.join(dir,'package.json')));
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],dir);
  dependencies[name]='file:'+path.join(temp,name.replace('@','').replace('/','-')+'-'+meta.version+'.tgz');
  if(name.startsWith('v'))assert.doesNotMatch(run('tar',['-tzf',dependencies[name].slice(5)]),/\/(test|bench|node_modules)\//);
 }
 for(const manager of ['npm','bun']){
  const dir=path.join(temp,manager);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies,overrides:dependencies}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--offline','--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
  fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),api=require('vfloating-ui-react-dom');function App(){const f=api.useFloating({middleware:[api.offset(4)]});return React.createElement('div',{style:f.floatingStyles},f.placement);}assert.match(renderToString(React.createElement(App)),/bottom/);`);
  fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import {useFloating} from 'vfloating-ui-react-dom';import {createRequire} from 'node:module';assert.equal(useFloating,createRequire(import.meta.url)('vfloating-ui-react-dom').useFloating);`);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
  fs.writeFileSync(path.join(dir,'browser.mjs'),`import {useFloating,arrow} from 'vfloating-ui-react-dom';globalThis.reactDOMBrowser={useFloating,arrow};`);run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
  const upstream=fs.readFileSync(path.join(__dirname,'upstream/index.test-d.tsx.txt'),'utf8').replace("'../src'","'vfloating-ui-react-dom'");
  fs.writeFileSync(path.join(dir,'upstream.tsx'),upstream);
  fs.writeFileSync(path.join(dir,'original.tsx'),upstream.replace("'vfloating-ui-react-dom'","'@floating-ui/react-dom'"));
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(dir,'types.'+ext),`import {useFloating,offset,flip,shift,limitShift,arrow,type Middleware} from 'vfloating-ui-react-dom';import {createRef} from 'react';const middleware:Middleware[]=[offset(()=>4,[4]),flip({crossAxis:false}),shift({limiter:limitShift({offset:4})}),arrow({element:createRef<HTMLDivElement>()})];function Hook(){const f=useFloating<HTMLButtonElement>({middleware,open:true});const b:HTMLButtonElement|null=f.refs.reference.current;void b;return f.floatingStyles;}void Hook;`);
  for(const mode of ['NodeNext','Bundler']){
   fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],jsx:'react-jsx',module:mode==='Bundler'?'ESNext':'NodeNext',moduleResolution:mode},files:['types.cts','types.mts']}));
   run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
   const config=JSON.parse(fs.readFileSync(path.join(dir,'tsconfig.json')));config.files=['upstream.tsx','original.tsx'];fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify(config));
   const result=spawnSync('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],{cwd:dir,encoding:'utf8'});
   // TS7's DOM now allows string assignment to HTMLElement.style. Preserve the
   // original assertion and require exactly the same obsolete-expectation error
   // for both declarations, with no additional errors or modified assertions.
   assert.equal(result.status,2,result.stdout+result.stderr);
   assert.deepEqual(result.stdout.trim().split(/\r?\n/).sort(),['original.tsx(20,11): error TS2578: Unused \'@ts-expect-error\' directive.','upstream.tsx(20,11): error TS2578: Unused \'@ts-expect-error\' directive.']);
  }
 }
 console.log('Packed React DOM + DOM/core/utils: npm/Bun, CJS/ESM, SSR, browser bundle and TypeScript 7 consumers pass; original type tests have the same one obsolete DOM assertion on both implementations.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
