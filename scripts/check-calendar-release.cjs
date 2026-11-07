'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const args=process.argv.slice(2),directory=path.resolve(args[0]||'.'),published=args.includes('--published');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-calendar-install-'));
function run(command,argv){const r=spawnSync(command,argv,{cwd:temp,encoding:'utf8',timeout:180000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'cache'),CALENDAR_PACKAGES_DIR:path.join(temp,'node_modules')}});assert.equal(r.status,0,(r.stdout+r.stderr).slice(-6000));return r.stdout;}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
 const top=manifest.packages.find(p=>p.name==='vfullcalendar-react');assert.ok(top);
 const source=published?top.url:'file:'+path.join(directory,top.asset);
 const dependencies={react:'19.1.0','react-dom':'19.1.0'};
 if(published)dependencies['vfullcalendar-react']=source;
 const app={private:true,type:'module',dependencies,devDependencies:{'@types/react':'19.2.10','@types/react-dom':'19.2.3'}};
 // Before publication, extract the exact archives after installing peers.
 // Bun cannot redirect URL dependencies through ordinary name overrides.
 // The public mode below verifies real transitive resolution without overrides.
 fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify(app,null,2)+'\n');
 run('bun',['install','--ignore-scripts']);
 if(!published)for(const item of manifest.packages){
  const unpack=path.join(temp,'unpack-'+item.name);fs.mkdirSync(unpack);
  run('tar',['-xzf',path.join(directory,item.asset),'-C',unpack]);
  fs.renameSync(path.join(unpack,'package'),path.join(temp,'node_modules',item.name));
 }
 const lock=fs.readFileSync(path.join(temp,'bun.lock'),'utf8');
 for(const item of manifest.packages) {
  assert.equal(digest(fs.readFileSync(path.join(directory,item.asset))),item.sha256,item.asset);
  const installed=path.join(temp,'node_modules',item.name),metadata=JSON.parse(fs.readFileSync(path.join(installed,'package.json')));
  assert.equal(metadata.version,item.version);assert.deepEqual(metadata.dependencies||{},item.dependencies);
  for(const [file,hash] of Object.entries(item.sourceFiles))assert.equal(digest(fs.readFileSync(path.join(installed,file))),hash,item.name+'/'+file);
  if(published){assert.ok(lock.includes(item.url),'Lockfile must pin '+item.name+' to its release URL');assert.ok(!app.overrides);}
 }
 fs.writeFileSync(path.join(temp,'consumer.mjs'),`import assert from 'node:assert/strict';import Calendar,{formatDate} from 'vfullcalendar-react';import daygrid from 'vfullcalendar-react/daygrid';import timegrid from 'vfullcalendar-react/timegrid';import interaction from 'vfullcalendar-react/interaction';import theme from 'vfullcalendar-react/themes/classic';import {requestJson,JsonRequestError} from 'vfullcalendar-core/protected-api';assert.ok(Calendar);for(const value of [daygrid,timegrid,interaction,theme])assert.ok(value);assert.equal(typeof formatDate,'function');assert.equal(typeof requestJson,'function');assert.equal(typeof JsonRequestError,'function');`);
 for(const runtime of ['node','bun'])run(runtime,['consumer.mjs']);
 fs.writeFileSync(path.join(temp,'consumer.tsx'),`import * as React from 'react';import Calendar,{type CalendarRef,type EventDisplayInfo} from 'vfullcalendar-react';import daygrid from 'vfullcalendar-react/daygrid';import timegrid from 'vfullcalendar-react/timegrid';import interaction from 'vfullcalendar-react/interaction';import theme from 'vfullcalendar-react/themes/classic';import 'vfullcalendar-react/skeleton.css';import 'vfullcalendar-react/themes/classic/theme.css';import 'vfullcalendar-react/themes/classic/palette.css';export function App(){const ref=React.useRef<CalendarRef>(null);return <Calendar ref={ref} plugins={[daygrid,timegrid,interaction,theme]} initialView="dayGridMonth" height="100%" eventContent={(info:EventDisplayInfo)=><span>{info.event.title}</span>}/>;}`);
 run('bun',['build','consumer.tsx','--target','browser','--outdir','dist']);assert.ok(fs.existsSync(path.join(temp,'dist/consumer.css')));
 fs.writeFileSync(path.join(temp,'css.d.ts'),"declare module '*.css';\n");
 fs.writeFileSync(path.join(temp,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',lib:['ES2022','DOM','DOM.Iterable'],types:[]},files:['consumer.tsx','css.d.ts']}));
 run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json']);
 const before=fs.readFileSync(path.join(temp,'bun.lock'));run('bun',['install','--frozen-lockfile','--ignore-scripts']);assert.deepEqual(fs.readFileSync(path.join(temp,'bun.lock')),before);
 for(const runtime of ['node','bun'])run(runtime,[path.join(__dirname,'fullcalendar-react-conformance/transitions.cjs')]);
 run('node',[path.join(__dirname,'fullcalendar-react-conformance/application-browser.cjs')]);
 console.log((published?'Public URL, no overrides; resolved dependencies':'Local extracted archives; dependency metadata')+': exact source hashes, Node/Bun imports and date regressions, native Chrome interactions/label bounds, plugin/CSS browser build, TS7 consumer and frozen install pass.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
