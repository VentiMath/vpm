'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'),{createHash}=require('node:crypto');
const source=path.join(__dirname,'upstream');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
let named=stripTypeScriptTypes(fs.readFileSync(path.join(source,'src/named-references.ts.txt'),'utf8')).replaceAll('export const','const');
named=named.replace('const entities                         = {};','const entities = Object.create(null);');
// Type erasure retains whitespace; match the initializer independently of spacing.
named=named.replace(/const entities\s*= \{\};/,'const entities = Object.create(null);').replace(/const characters\s*= \{\};/,'const characters = Object.create(null);');
const start=named.indexOf('    return prev ?'),end=named.indexOf('\n}',start);
assert.ok(start>0&&end>start);named=named.slice(0,start)+`    if (prev) { Object.assign(entities, prev.entities); Object.assign(characters, prev.characters); }
    return {entities: Object.freeze(entities), characters: Object.freeze(characters)};`+named.slice(end);
let numeric=stripTypeScriptTypes(fs.readFileSync(path.join(source,'src/numeric-unicode-map.ts.txt'),'utf8')).replaceAll('export const','const');
const output="'use strict';\n// Generated from html-entities 2.6.0 data; MIT, see LICENSE and PROVENANCE.json.\n// Regenerate with scripts/entities-conformance/generate-data.cjs.\n"+named.split('\n').map(line=>line.trimEnd()).filter((line,i,lines)=>line||lines[i-1]).join('\n')+'\n'+numeric.split('\n').map(line=>line.trimEnd()).join('\n')+'\nmodule.exports = {namedReferences, bodyRegExps, numericUnicodeMap};\n';
const target=path.resolve(__dirname,'../../packages/vhtml-entities/lib/data.js');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),output);else fs.writeFileSync(target,output);
