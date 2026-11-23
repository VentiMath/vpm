'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fixture=require('./fixture.cjs');
const replacement=process.env.VPM_BALANCED_PACKAGE||path.resolve(__dirname,'../../packages/vbalanced-match');
const patterns=['{src,functions}/{api,ui}/**/*.{ts,tsx}','a{1..5}b','x{a,{b,c}}z','{a,b}{1..3}','x\\{y,z\\}','{{a,b}','{a,b}}','{01..05..2}','src/{**,.hidden}/file.{js,ts}'];
for(const legacy of [false,true]){
 const ref=fixture(path.join(__dirname,'node_modules',legacy?'balanced-app':'balanced-match'),legacy),vpm=fixture(replacement,legacy);
 try{for(const pattern of patterns){
  assert.deepEqual(vpm.expand(pattern),ref.expand(pattern),pattern);
  if(!legacy)for(const file of ['src/ui/a.tsx','functions/api/a.ts','src/.hidden/file.js','a1b','xabz'])for(const options of [{},{dot:true},{nocase:true}])assert.equal(vpm.minimatch(file,pattern,options),ref.minimatch(file,pattern,options),file+' '+pattern);
 }}finally{ref.close();vpm.close();}
}
console.log('Unchanged brace-expansion 2/5 and minimatch 10 callers pass.');
