'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const source=path.join(__dirname,'node_modules/@nodable/entities/src');
 for(const file of ['entities.js','all-entities.js'])assert.equal(fs.readFileSync(path.join(source,file),'utf8').trimEnd(),fs.readFileSync(path.join(__dirname,'upstream/src',file+'.txt'),'utf8').trimEnd());
 const groups=await import(pathToFileURL(path.join(source,'entities.js')).href);
 const fixes={ocirc:'ô',boxDl:'╖',boxdL:'╕',af:'\u2061'};
 const header='// Generated from @nodable/entities 3.1.0; MIT, see LICENSE/PROVENANCE.json.\n// Four standard-name corrections: see scripts/nodable-entities-conformance/generate-data.cjs.\n';
 const names=Object.keys(groups),data={};for(const name of names)data[name]=Object.fromEntries(Object.entries(groups[name]).map(([k,v])=>[k,fixes[k]??v]));
 const order=['BASIC_LATIN','LATIN_ACCENTS','LATIN_EXTENDED','GREEK','CYRILLIC','MATH','MATH_ADVANCED','ARROWS','SHAPES','PUNCTUATION','CURRENCY','FRACTIONS','MISC_SYMBOLS'];
 const cjs="'use strict';\n"+header+names.map(n=>'exports.'+n+' = Object.freeze(Object.setPrototypeOf('+JSON.stringify(data[n])+', null));').join('\n')+'\nexports.ALL_ENTITIES = Object.freeze(Object.assign(Object.create(null), '+order.map(n=>'exports.'+n).join(', ')+'));\n';
 const esm=header+names.map(n=>'export const '+n+' = /*#__PURE__*/ Object.freeze(/*#__PURE__*/ Object.setPrototypeOf('+JSON.stringify(data[n])+', null));').join('\n')+'\n';
 const all=header+'import { '+order.join(', ')+' } from "./tables.mjs";\nexport const ALL_ENTITIES = /*#__PURE__*/ Object.freeze({'+order.map(n=>'...'+n).join(', ')+'});\n';
 for(const [file,content]of [['tables.js',cjs],['tables.mjs',esm],['all-entities.mjs',all]])fs.writeFileSync(path.join(__dirname,'../../packages/vnodable-entities/lib',file),content);
 console.log(`${names.length} category tables generated; four standard names corrected.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
