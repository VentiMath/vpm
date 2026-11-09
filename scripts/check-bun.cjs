'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const expected=fs.readFileSync(path.join(root,'.bun-version'),'utf8').trim();
assert.match(expected,/^\d+\.\d+\.\d+$/);
assert.equal(require('../package.json').packageManager,'bun@'+expected,'packageManager must match .bun-version');
const actual=process.versions.bun??execFileSync('bun',['--version'],{encoding:'utf8'}).trim();
assert.equal(actual,expected,`Use Bun ${expected}, matching CI; found ${actual}`);
for(const file of fs.readdirSync(path.join(root,'.github/workflows'))){
 const text=fs.readFileSync(path.join(root,'.github/workflows',file),'utf8');
 for(const pin of text.matchAll(/\bbun-version:\s*([^\s#]+)/g))assert.equal(pin[1],expected,file+': Bun pin differs');
}
console.log(`Bun ${expected}: local executable, packageManager and workflow pins agree.`);
