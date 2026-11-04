'use strict';
// Pack a committed vlx snapshot. Only dependency locations are rewritten;
// runtime, declarations, CSS, license and provenance bytes must match the commit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const names=['vlx','vpngjs'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function build({ref,tag,out}) {
 assert.match(tag,/^vlx-\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/);
 assert.ok(out,'An output directory is required');out=path.resolve(out);
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Output must be empty; existing release assets are never overwritten');
 const commit=execFileSync('git',['rev-parse','--verify',ref+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-vlx-release-'));
 try {
  fs.writeFileSync(path.join(temp,'source.tar'),execFileSync('git',['archive','--format=tar',commit,'--',...names.map(n=>'packages/'+n)],{cwd:root,maxBuffer:32*1024*1024}));
  execFileSync('tar',['-xf',path.join(temp,'source.tar'),'-C',temp]);
  const base='https://github.com/VentiMath/vpm/releases/download/'+tag;
  const metadata=Object.fromEntries(names.map(name=>[name,JSON.parse(fs.readFileSync(path.join(temp,'packages',name,'package.json')))]));
  const assets=Object.fromEntries(names.map(name=>[name,name+'-'+metadata[name].version+'.tgz']));
  const manifest={schemaVersion:1,repository:'https://github.com/VentiMath/vpm',sourceCommit:commit,tag,packingTool:execFileSync('bun',['--version'],{encoding:'utf8'}).trim(),packages:[]};
  for(const name of names) {
   const dir=path.join(temp,'packages',name),original=metadata[name],published=structuredClone(original);
   const provenance=JSON.parse(fs.readFileSync(path.join(dir,'PROVENANCE.json')));
   if(name==='vlx'){assert.equal(provenance.implementation.kind,'independent parser and layout implementation');assert.ok(tag==='vlx-'+original.version||tag.startsWith('vlx-'+original.version+'-'),'Tag must identify the VLX version');}
   else assert.equal(original.version,provenance.upstream.version,name+': package version must match the upstream baseline');
   for(const field of ['dependencies','optionalDependencies'])for(const dependency of Object.keys(published[field]||{})) {
    assert.ok(assets[dependency],name+': dependency is missing from this release: '+dependency);
    published[field][dependency]=base+'/'+assets[dependency];
   }
   fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify(published,null,2)+'\n');
   execFileSync('bun',['pm','pack','--ignore-scripts','--destination',out,'--quiet'],{cwd:dir,stdio:['ignore','pipe','pipe']});
   const archive=path.join(out,assets[name]);
   const unpack=path.join(temp,'unpack-'+name);fs.mkdirSync(unpack);
   const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
   for(const entry of entries){assert.match(entry,/^package\//);assert.ok(!entry.split('/').includes('..'));assert.doesNotMatch(entry,/^package\/(?:test|bench|node_modules)\//);}
   execFileSync('tar',['-xzf',archive,'-C',unpack]);
   const sourceFiles={};
   for(const entry of entries.filter(p=>!p.endsWith('/'))) {
    const packed=path.join(unpack,entry),relative=entry.slice(8);
    assert.ok(fs.lstatSync(packed).isFile(),'Only regular package files may ship');
    if(relative==='package.json')assert.deepEqual(JSON.parse(fs.readFileSync(packed)),published);
    else {const bytes=fs.readFileSync(packed);assert.deepEqual(bytes,fs.readFileSync(path.join(dir,relative)),name+'/'+relative);sourceFiles[relative]=hash(bytes);}
   }
   for(const required of ['package.json','LICENSE','PROVENANCE.json','README.md',...(name==='vlx'?['ACCESSIBILITY.md','font/NOTICE','font/LICENSE','dom.cjs','dom.mjs','dom.d.ts']:[])])assert.ok(entries.includes('package/'+required),name+': '+required);
   manifest.packages.push({name,version:published.version,asset:assets[name],url:base+'/'+assets[name],sha256:hash(fs.readFileSync(archive)),packageJsonSHA256:hash(fs.readFileSync(path.join(unpack,'package/package.json'))),dependencies:published.dependencies||{},sourceFiles});
  }
  const top=manifest.packages.find(p=>p.name==='vlx');
  fs.writeFileSync(path.join(out,'consumer-package.json'),JSON.stringify({dependencies:{vlx:top.url}},null,2)+'\n');
  fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const checksums=[...manifest.packages.map(p=>[p.asset,p.sha256]),...['release-manifest.json','consumer-package.json'].map(file=>[file,hash(fs.readFileSync(path.join(out,file)))])];
  fs.writeFileSync(path.join(out,'SHA256SUMS'),checksums.map(([file,digest])=>digest+'  '+file).join('\n')+'\n');
  console.log(JSON.stringify({sourceCommit:commit,tag,packages:manifest.packages.map(({name,version,url})=>({name,version,url}))},null,2));
  return manifest;
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={build};
if(require.main===module){const args=process.argv.slice(2);const take=name=>args[args.indexOf(name)+1];assert.ok(args.includes('--ref')&&args.includes('--tag')&&args.includes('--out'),'Usage: node scripts/pack-vlx-release.cjs --ref COMMIT --tag vlx-VERSION --out EMPTY_DIRECTORY');build({ref:take('--ref'),tag:take('--tag'),out:take('--out')});}
