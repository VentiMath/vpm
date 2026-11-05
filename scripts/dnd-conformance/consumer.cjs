'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
function verify(location,manifest){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-dnd-consumer-'));
 function run(cmd,args,cwd,extra={}){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:3e6,env:{...process.env,...extra,npm_config_cache:path.join(temp,'npm-cache'),BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache')}});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
 try{for(const [manager,react]of[['npm','19.1.0'],['bun','19.2.4']]){
  const dir=path.join(temp,manager);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'@hello-pangea/dnd':location,react,'react-dom':react,'@types/react':'19.2.14',jsdom:'27.4.0'}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],dir);
  const lock=path.join(dir,manager==='npm'?'package-lock.json':'bun.lock'),before=fs.readFileSync(lock);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--frozen-lockfile','--ignore-scripts'],dir);assert.deepEqual(fs.readFileSync(lock),before);
  const installed=path.join(dir,'node_modules/@hello-pangea/dnd'),p=JSON.parse(fs.readFileSync(path.join(installed,'package.json')));assert.equal(p.name,'vhello-pangea-dnd');assert.equal(p.version,'18.0.1');assert.equal(Object.keys(p.dependencies||{}).length,0);
  if(manifest)for(const [file,digest]of Object.entries(manifest.packages[0].sourceFiles))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(installed,file))).digest('hex'),digest,file);
  for(const name of ['redux','react-redux','@babel/runtime','css-box-model','raf-schd'])assert(!fs.existsSync(path.join(dir,'node_modules',name)),name+' should not install');
  fs.writeFileSync(path.join(dir,'identity.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as D from '@hello-pangea/dnd';assert.equal(createRequire(import.meta.url)('@hello-pangea/dnd').DragDropContext,D.DragDropContext);`);
  for(const runtime of ['node','bun']){run(runtime,['identity.mjs'],dir);for(const mode of ['server','client'])console.log(run(runtime,[path.join(__dirname,'run.cjs'),'vpm',react,mode],dir,{VPM_DND_CONSUMER:dir}).trim());}
  fs.writeFileSync(path.join(dir,'consumer.tsx'),`import * as React from 'react';import {DragDropContext,Droppable,Draggable,type DropResult,type DraggableProvidedDragHandleProps} from '@hello-pangea/dnd';const end=(r:DropResult)=>{const n:number|undefined=r.destination?.index;};function Header(p:{handle:DraggableProvidedDragHandleProps|null}){return <div {...p.handle}/>;}const board=<DragDropContext onDragEnd={end}><Droppable droppableId="lists" direction="horizontal" type="list">{p=><div ref={p.innerRef}>{["a"].map((id,index)=><Draggable key={id} draggableId={id} index={index}>{(q,s)=><div ref={q.innerRef} {...q.draggableProps} {...q.dragHandleProps}><Header handle={q.dragHandleProps}/><Droppable droppableId={id} type="card">{r=><div ref={r.innerRef}>{r.placeholder}</div>}</Droppable>{String(s.isDragging)}</div>}</Draggable>)}{p.placeholder}</div>}</Droppable></DragDropContext>;
// @ts-expect-error virtual lists deliberately unsupported
const virtual=<Droppable droppableId="x" mode="virtual">{()=>null}</Droppable>;
// @ts-expect-error direction typo
const direction=<Droppable droppableId="x" direction="diagonal">{()=>null}</Droppable>;`);
  for(const resolution of ['NodeNext','Bundler']){fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,exactOptionalPropertyTypes:true,noEmit:true,jsx:'react-jsx',target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.tsx']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);}
  fs.copyFileSync(path.join(__dirname,'browser-entry.mjs'),path.join(dir,'browser-entry.mjs'));run('bun',[path.join(__dirname,'build.cjs'),dir,dir],dir);
  for(const variant of ['upstream','vpm'])console.log(react,run('node',[path.join(__dirname,'browser.cjs'),dir,variant],dir).trim());
 }
 console.log('Exact aliased npm/Bun fresh/frozen installs, zero runtime dependencies, both React versions, Node/Bun SSR/hydration, TS7 and native browser controls pass.');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}}
module.exports={verify};
