'use strict';
const path=require('node:path'),fs=require('node:fs'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
async function build(consumer,destination,production=false){
 for(const version of consumer?[consumer]:[__dirname,path.join(__dirname,'current')]){
  const folder=destination||path.join(version,production?'node_modules/.vpm-dnd-production':'node_modules/.vpm-dnd');fs.mkdirSync(folder,{recursive:true});
  for(const variant of ['upstream','vpm']){
   const entry=consumer?path.join(consumer,'browser-entry.mjs'):path.join(__dirname,'entry.mjs');
   const result=await Bun.build({entrypoints:[entry],format:consumer?'esm':'cjs',target:consumer?'browser':'node',define:consumer||production?{'process.env.NODE_ENV':'"production"'}:{},plugins:[{name:'DND controls',setup(b){
    b.onResolve({filter:/^@hello-pangea\/dnd$/},()=>({path:variant==='vpm'?(consumer && consumer!==__dirname && consumer!==path.join(__dirname,'current')?require.resolve('@hello-pangea/dnd',{paths:[consumer]}):path.join(root,'packages/vhello-pangea-dnd/index.mjs')):require.resolve('@hello-pangea/dnd',{paths:[__dirname]})}));
    b.onResolve({filter:/^react(?:-dom)?(?:\/|$)/},({path:specifier})=>consumer?{path:require.resolve(specifier,{paths:[consumer]})}:{path:specifier,external:true});
   }}]});if(!result.success)throw Error(result.logs.join('\n'));await Bun.write(path.join(folder,variant+(consumer?'.mjs':'.cjs')),result.outputs[0]);
  }
  if(!consumer)fs.writeFileSync(path.join(folder,'sources.json'),JSON.stringify(sources()));
 }
}
function sources(){const hash=f=>createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');const files=['packages/vhello-pangea-dnd/index.cjs','packages/vhello-pangea-dnd/engine.cjs','packages/vhello-pangea-dnd/index.mjs','packages/vhello-pangea-dnd/package.json','scripts/dnd-conformance/build.cjs','scripts/dnd-conformance/entry.mjs','scripts/dnd-conformance/package-lock.json','scripts/dnd-conformance/current/package-lock.json'];return Object.fromEntries(files.map(f=>[f,hash(f)]));}
module.exports={build,sources};if(require.main===module)build(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1;});
