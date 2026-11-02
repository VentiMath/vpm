'use strict';
// Real pointer/layout checks for the independently implemented application scope.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('./node_modules/playwright-core');
const esbuild=require('./node_modules/esbuild');
const root=path.resolve(__dirname,'../..'),pkg=path.join(root,'packages/vfullcalendar-react');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-calendar-browser-'));
 let browser;
 try {
 await esbuild.build({stdin:{contents:`import React,{StrictMode,createRef} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import Calendar from ${JSON.stringify(pkg+'/index.js')};
 const ref=createRef(),root=createRoot(document.getElementById('app'));window.calls={select:[],drop:[],resize:[],click:[]};
 const events=[{id:'a',title:'Algebra seminar',start:'2026-11-03T10:00:00Z',end:'2026-11-03T11:00:00Z',extendedProps:{label:'math'}},{id:'b',title:'Geometry workshop',start:'2026-11-03T10:30:00Z',end:'2026-11-03T11:30:00Z'},{id:'multi',title:'Conference',start:'2026-11-02',end:'2026-11-05'},...Array.from({length:5},(_,i)=>({id:'extra'+i,title:'Study group '+i,start:'2026-11-04'}))];
 let options={initialDate:'2026-11-03',timeZone:'UTC',height:'100%',headerToolbar:false,editable:true,selectable:true,selectMirror:true,dayMaxEvents:true,events,borderless:true,dayHeaderInnerClass:'calendar-day-header-text',dayCellTopInnerClass:'calendar-day-number',eventClass:'calendar-event',eventContent:info=>React.createElement('span',{'data-title':info.event.title},info.timeText+' '+info.event.title),select:info=>calls.select.push({start:info.startStr,end:info.endStr,allDay:info.allDay,pageX:info.jsEvent?.pageX}),eventClick:info=>calls.click.push(info.event.id),eventDrop:info=>{calls.drop.push({id:info.event.id,start:info.event.startStr,allDay:info.event.allDay,old:info.oldEvent.startStr});window.revert=info.revert;},eventResize:info=>calls.resize.push({id:info.event.id,end:info.event.endStr}),views:{timeGridWeek:{titleFormat:{year:'numeric',month:'short',day:'numeric'}}}};
 window.mount=changes=>{options={...options,...changes};flushSync(()=>root.render(React.createElement(StrictMode,null,React.createElement(Calendar,{...options,ref}))));window.api=ref.current.getApi();};window.mount({});window.unmount=()=>flushSync(()=>root.unmount());`,resolveDir:__dirname,loader:'js'},bundle:true,format:'iife',platform:'browser',outfile:path.join(dir,'app.js'),alias:{react:path.join(__dirname,'node_modules/react'),'react-dom':path.join(__dirname,'node_modules/react-dom'),'vfull-ui-headless-calendar':path.join(root,'packages/vfull-ui-headless-calendar/index.js'),'vfullcalendar-core/protected-api':path.join(root,'packages/vfullcalendar-core/protected-api.js')}});
 const css=['skeleton.css','themes/classic/theme.css','themes/classic/palette.css'].map(f=>fs.readFileSync(path.join(pkg,f),'utf8')).join('\n');
 fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#f5f6fa;font:14px system-ui;color:#1c2535}#app{height:700px;--fc-classic-background:#fff;--fc-classic-foreground:#1c2535;--fc-classic-border:#d8dce5;--fc-classic-primary:#5d59d4}button{cursor:pointer}.calendar-event{margin:0 6px 4px}.calendar-day-number{border-radius:50%}.calendar-day-header-text{font-weight:600}${css}</style><div id="app"></div><script src="app.js"></script>`);
 const executable=process.env.CHROME_BIN||(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)));
 browser=await chromium.launch({...(executable?{executablePath:executable}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:820}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.join(dir,'index.html'));await page.waitForFunction(()=>window.api);
 const event=name=>page.locator('.vfc-event').filter({has:page.locator('[data-title="'+name+'"]')});
 const cell=date=>page.locator('.vfc-day-cell[data-date="'+date+'"]');
 assert.equal(await cell('2026-11-03').count(),1);assert.equal(await event('Conference').count(),1,'multi-day event is one spanning segment');
 const box=await event('Conference').boundingBox(),day=await cell('2026-11-02').boundingBox();assert.ok(box.width>day.width*2.5,'multi-day event spans three columns');
 await event('Algebra seminar').click();assert.deepEqual(await page.evaluate(()=>calls.click),['a']);
 await page.locator('.vfc-more').first().click();assert.equal(await page.getByRole('dialog').count(),1);await page.getByLabel('Close events').click();
 async function drag(from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
 const b4=await cell('2026-11-08').boundingBox(),b5=await cell('2026-11-10').boundingBox();
 await page.mouse.move(b4.x+40,b4.y+70);await page.mouse.down();await page.mouse.move(b5.x+40,b5.y+70,{steps:8});assert.equal(await page.locator('.vfc-selected').count(),3,'selection preview');await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>{const s=calls.select.at(-1);return [s.start,s.end,s.allDay,typeof s.pageX]}),['2026-11-08','2026-11-11',true,'number']);
 const eb=await event('Conference').boundingBox(),target=await cell('2026-11-03').boundingBox();await drag({x:eb.x+12,y:eb.y+8},{x:target.x+12,y:eb.y+8});
 assert.deepEqual(await page.evaluate(()=>calls.drop.at(-1)),{id:'multi',start:'2026-11-03',allDay:true,old:'2026-11-02'});await page.evaluate(()=>revert());assert.equal(await page.evaluate(()=>api.getEventById('multi').startStr),'2026-11-02');
 const timedMonth=await event('Algebra seminar').boundingBox(),nextDay=await cell('2026-11-04').boundingBox();await drag({x:timedMonth.x+10,y:timedMonth.y+5},{x:nextDay.x+10,y:timedMonth.y+5});assert.deepEqual(await page.evaluate(()=>calls.drop.at(-1)),{id:'a',start:'2026-11-04T10:00:00Z',allDay:false,old:'2026-11-03T10:00:00Z'});await page.evaluate(()=>revert());
 await page.evaluate(()=>api.changeView('timeGridDay'));await page.waitForSelector('.vfc-time-column');
 const one=await event('Algebra seminar').boundingBox(),two=await event('Geometry workshop').boundingBox();assert.ok(one.x+one.width<=two.x+1||two.x+two.width<=one.x+1,'overlapping timed events have separate columns');
 await drag({x:one.x+one.width/2,y:one.y+10},{x:one.x+one.width/2,y:one.y+58});assert.equal(await page.evaluate(()=>calls.drop.at(-1).start),'2026-11-03T11:00:00Z');
 const handle=await event('Algebra seminar').locator('.vfc-resize').boundingBox();await drag({x:handle.x+handle.width/2,y:handle.y+2},{x:handle.x+handle.width/2,y:handle.y+26});assert.equal(await page.evaluate(()=>calls.resize.at(-1).end),'2026-11-03T12:30:00Z');
 await page.evaluate(()=>api.changeView('timeGridWeek'));await page.waitForFunction(()=>document.querySelectorAll('.vfc-time-column').length===7);assert.match(await page.evaluate(()=>api.view.title),/Nov/);assert.equal(await page.locator('.vfc-time-column').count(),7);assert.equal(await event('Conference').count(),1);
 // Inherited application theme variables change without remounting the calendar.
 const light=await page.locator('.vfc-calendar').evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.evaluate(()=>{document.getElementById('app').style.setProperty('--fc-classic-background','#161b29');document.getElementById('app').style.setProperty('--fc-classic-foreground','#eef3ff');});
 const dark=await page.locator('.vfc-calendar').evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(light,dark);
 if(process.env.CALENDAR_SCREENSHOT)await page.screenshot({path:process.env.CALENDAR_SCREENSHOT,fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>api.changeView('dayGridMonth'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile view does not overflow');
 await page.evaluate(()=>mount({events:[]}));assert.equal(await page.locator('.vfc-event').count(),0);await page.evaluate(()=>unmount());assert.equal(await page.locator('.vfc-calendar').count(),0);assert.deepEqual(errors,[]);
 console.log('Calendar browser: StrictMode, spanning/overlapping layout, clicks, overflow, selection preview, drag/revert/resize, 3 views, theme changes, mobile width, filtering and unmount pass.');
 }finally{await browser?.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
