"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-lists-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./lists-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/lists-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/lists-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>setTimeout(r,45))';
 const snapshot=`(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');const color=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};const keys=['display','minHeight','height','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','fontSize','fontWeight','lineHeight','color','borderRadius','backgroundColor','borderBottomWidth','minWidth'];return [...document.querySelectorAll('#variants .MuiMenuItem-root,#variants .MuiList-root,#variants .MuiListItemIcon-root,#variants .MuiListItemText-root,#variants .MuiListItemText-primary,#variants .MuiListItemText-secondary,#variants .MuiListSubheader-root')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,k.toLowerCase().endsWith('color')?color(getComputedStyle(el)[k]):getComputedStyle(el)[k]]))}))})()`;
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const press=async(key,code=key)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:({ArrowDown:40,ArrowUp:38,Home:36,End:35,Enter:13,' ':32})[key]||key.toUpperCase().charCodeAt(0)});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});await evaluate(settle);return evaluate('document.activeElement.id')};
 for(const version of ['current','app']){
  const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.menuControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Menu fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const dense of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,dense})+');'+settle);
    styles.push({mode,rtl,variables,custom,dense,values:await evaluate(snapshot)});
   }
   await evaluate('window.renderVariants({});document.querySelector("#outside").focus();'+settle);
   const actions=[];
   await evaluate('document.getElementById("menu").focus()');
   for(const key of ['ArrowDown','ArrowDown','ArrowDown','ArrowUp','End','ArrowDown','Home','b','b','b'])actions.push(await press(key));
   await evaluate('document.getElementById("alpha").focus()');await press('Enter');
   assert.equal(await evaluate('window.menuControls.events.at(-1)'),'alpha');
   await press(' ','Space');assert.equal(await evaluate('window.menuControls.events.length'),2);
   await evaluate('window.savedItem=document.getElementById("alpha");window.renderVariants({tick:2});'+settle);
   assert.equal(await evaluate('document.activeElement===window.savedItem && document.getElementById("alpha")===window.savedItem'),true,'stable focus');
   assert.equal(await evaluate('window.menuControls.refs.current.alpha===window.savedItem'),true);
   await evaluate('window.renderVariants({disabledItemsFocusable:true,disableListWrap:true});'+settle);
   await evaluate('document.getElementById("beta").focus()');actions.push(await press('ArrowDown'));
   await press('Enter');assert.equal(await evaluate('window.menuControls.events.length'),2,'disabled activation');
   await evaluate('document.getElementById("link").focus()');actions.push(await press('ArrowDown'));
   await evaluate('window.renderVariants({autoFocusItem:true});'+settle);actions.push(await evaluate('document.activeElement.id'));
   await evaluate('document.getElementById("native-choice").click();document.getElementById("native-disabled").click();'+settle);
   assert.deepEqual(await evaluate('[window.menuControls.events.at(-1),document.getElementById("native-choice").type,document.getElementById("native-disabled").disabled]'),['native','button',true]);
   const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='menu'&&n.name?.value==='Contests'));
   rows.push({styles,actions});
   await evaluate('window.unmountVariants();'+settle);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydrate-item")'),true,name+' hydration retains item');
  }
  fs.writeFileSync(path.join(os.tmpdir(),'vpm-lists-'+version+'.json'),JSON.stringify(rows,null,2));
  // Material9 reduced the standalone icon gutter to36px; app7 uses56px.
  const actual=structuredClone(rows[1]);
  if(version==='app'){assert.deepEqual([actual.actions.at(-1),rows[0].actions.at(-1)],['link','alpha']);actual.actions[actual.actions.length-1]='alpha';}
  if(version==='app')for(const row of actual.styles){const i=actual.styles.indexOf(row),ref=rows[0].styles[i];if(!row.custom){const a=row.values.find(v=>v.id==='plain-icon'),b=ref.values.find(v=>v.id==='plain-icon');assert.deepEqual([a.css.minWidth,b.css.minWidth],['36px','56px']);a.css.minWidth=b.css.minWidth;}}
  assert.deepEqual(actual,rows[0],version+' list styles and keyboard');comparisons+=rows[0].styles.length;
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));console.log(comparisons+' list/menu theme comparisons; keyboard, activation, refs, accessibility and hydration pass');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,2000))]);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
