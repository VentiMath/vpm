'use strict';
// Local read-only corpus check. Private statements and failed snippets are never
// written to this public repository. Only aggregate counts/hashes are printed.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
(async()=>{
 const app=process.argv[2];if(!app)throw Error('Pass the local app repository');const ref=process.argv[3]||'origin/main',temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-corpus-'));
 try{
  const normalize=execFileSync('git',['show',ref+':src/components/problems/latexNormalize.ts'],{cwd:app});fs.writeFileSync(path.join(temp,'normalize.ts'),normalize);const {normalizeStatementLatex}=await import(pathToFileURL(path.join(temp,'normalize.ts')).href);
  const base=path.join(app,'data'),files=['usamo-problems-transcribed.json','usajmo-problems-transcribed.json','usamo-problems-aops.json','usajmo-problems-aops.json',...fs.readdirSync(path.join(base,'putnam-problems')).filter(n=>n.endsWith('.json')).sort().map(n=>'putnam-problems/'+n)];
  const vlx=require('../../packages/vlx'),statements=[],hashes={};function collect(value){if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){if(k==='statement'&&typeof v==='string')statements.push(v);else collect(v)}}
  for(const file of files){const bytes=fs.readFileSync(path.join(base,file));hashes[file]=createHash('sha256').update(bytes).digest('hex');collect(JSON.parse(bytes));}
  const unique=[...new Set(statements)],errors={},pageErrors={},failures=[],problem=require('./load.cjs')('problem');let math=0,passed=0,sourceErrors=0,pagesPassed=0;
  for(const statement of unique){const source=normalizeStatementLatex(statement),parsed=vlx.parse(source);if(parsed.diagnostics.length)sourceErrors++;try{problem.renderProblemSvg({statement:source});pagesPassed++;}catch(error){pageErrors[error.message]=(pageErrors[error.message]||0)+1;}
   for(const node of parsed.nodes)if(node.kind==='math'){math++;try{vlx.renderMath(node.tex,{display:node.display});passed++;}catch(error){const key=error.message;errors[key]=(errors[key]||0)+1;failures.push({tex:node.tex,error:key});}}
  }
  if(process.env.VLX_AUDIT_FAILURES){const target=path.resolve(process.env.VLX_AUDIT_FAILURES),repo=path.resolve(__dirname,'../..');if(target===repo||target.startsWith(repo+path.sep))throw Error('Private failure snippets must be saved outside the public repository');fs.writeFileSync(target,JSON.stringify(failures,null,2));}
  console.log(JSON.stringify({appCommit:execFileSync('git',['rev-parse',ref],{cwd:app,encoding:'utf8'}).trim(),files:files.length,statements:unique.length,math,passed,sourceErrors,pagesPassed,pageErrors,errors:Object.fromEntries(Object.entries(errors).sort((a,b)=>b[1]-a[1])),sourceDigest:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')},null,2));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
