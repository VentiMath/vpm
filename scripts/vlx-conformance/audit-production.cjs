'use strict';
// Consume a private, normalized expression inventory prepared at the caller
// boundary. Never print expressions, document paths, or application content.
const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),vlx=require('../../packages/vlx');
const file=process.argv[2];assert(file,'Pass the private normalized JSONL inventory');
const bytes=fs.readFileSync(file),sites=new Map(),docs=new Set();let total=0,valid=0,regressions=0,accepted=0,rejected=0;
for(const line of bytes.toString().trim().split('\n')){
 const r=JSON.parse(line);assert.equal(typeof r.tex,'string');assert.equal(typeof r.katexOk,'boolean');assert.equal(typeof r.display,'boolean');
 const name=r.site||'unspecified';let site=sites.get(name);if(!site){site={expressions:0,baselineAccepted:0,regressions:0,vlxAccepted:0,vlxRejected:0,documents:new Set()};sites.set(name,site);}
 total++;site.expressions++;site.documents.add(r.doc);docs.add(r.doc);
 if(r.katexOk){valid++;site.baselineAccepted++;}
 try{vlx.renderMath(r.tex,{display:r.display});accepted++;site.vlxAccepted++;}catch(error){if(!(error instanceof vlx.VlxError))throw error;rejected++;site.vlxRejected++;if(r.katexOk){regressions++;site.regressions++;}}
}
const report={inventorySHA256:createHash('sha256').update(bytes).digest('hex'),expressions:total,documents:docs.size,baselineAccepted:valid,baselineRejected:total-valid,regressions,vlxAccepted:accepted,vlxRejected:rejected,sites:Object.fromEntries([...sites].map(([name,s])=>[name,{...s,documents:s.documents.size}]))};
console.log(JSON.stringify(report,null,2));if(process.argv.includes('--check'))assert.equal(regressions,0,'Baseline-accepted expressions must render');
