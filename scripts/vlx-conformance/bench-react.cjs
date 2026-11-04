'use strict';
// Compare a supplied immutable release archive with the current package. Each
// worker loads one implementation; old source is never checked into the repo.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {JSDOM}=require('jsdom'),React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom');
const root=path.resolve(__dirname,'../../packages/vlx'),owner=!process.env.VPM_VLX_REACT_BENCH;
const directory=process.env.VPM_VLX_REACT_BENCH||fs.mkdtempSync(path.join(os.tmpdir(),'vlx-react-bench-'));
const archive=path.resolve(process.argv[2]||'');
function command(name,args,cwd){const r=spawnSync(name,args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}
let dom,reactRoot;
async function main(){
 if(owner){
  assert(fs.statSync(archive).isFile(),'Supply the previous release .tgz');
  fs.mkdirSync(path.join(directory,'baseline'));fs.mkdirSync(path.join(directory,'candidate'));
  command('tar',['-xzf',archive,'-C',path.join(directory,'baseline')]);
  command('bun',['pm','pack','--ignore-scripts','--destination',directory,'--quiet'],root);
  command('tar',['-xzf',path.join(directory,'vlx-0.1.0.tgz'),'-C',path.join(directory,'candidate')]);
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(directory,'node_modules'),'dir');
  process.env.VPM_VLX_REACT_BENCH=directory;
 }
 dom=new JSDOM('<!doctype html><div id="root"></div>',{pretendToBeVisual:true});
 for(const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','getComputedStyle'])Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
 const h=React.createElement,container=document.getElementById('root');
 const cases=[
  {name:'unchanged single formula',count:1},
  {name:'unchanged 20-formula paper',count:20},
  {name:'changed formula',count:1,changing:true},
 ].map(({name,count,changing})=>({name,async:false,
  async make(library){
   if(reactRoot)flushSync(()=>reactRoot.unmount());
   const api=require(library);await api.preloadMath();
   reactRoot=createRoot(container);let tick=0;
   const source=Array.from({length:count},(_,i)=>`Question ${i}: $x_{${i}}^2+1$.`).join(' ');
   function Paper({tick}){return h('section',{'data-tick':tick},count>1?h(api.MathText,{source}):h(api.InlineMath,{tex:changing&&tick%2?'x^3+1':'x^2+1'}));}
   return ()=>{flushSync(()=>reactRoot.render(h(Paper,{tick:++tick})));return container;};
  },
  validate(container){assert.equal(container.querySelectorAll('math').length,count);assert.match(container.textContent,/x/);},
 }));
 const report=await require('../bench-process.cjs').run({root,
  upstream:path.join(directory,'baseline/package/react.cjs'),vpm:path.join(directory,'candidate/package/react.cjs'),cases,
  files:['react.cjs','react-renderer.cjs','dom.cjs','index.cjs','source.cjs','layout.cjs','styles.cjs','font/glyphs.json','../../scripts/vlx-conformance/bench-react.cjs','../../scripts/vlx-conformance/package.json','../../scripts/vlx-conformance/package-lock.json'],
 });
 if(owner){
  report.baseline={archive:path.basename(archive),sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex')};
  report.scope='React 19.1 with jsdom 27.4; preloaded parent rerenders. No browser paint, first mount, application suite or production latency is measured.';
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
 if(reactRoot)flushSync(()=>reactRoot.unmount());dom?.window.close();
 if(owner)fs.rmSync(directory,{recursive:true,force:true});
});
