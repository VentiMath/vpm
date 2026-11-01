'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.join(__dirname,'upstream');
for(const [name,hash] of Object.entries(require('./upstream/provenance.json').files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),hash,name);
module.exports=Object.fromEntries(fs.readdirSync(path.join(root,'test/fixtures')).map(file=>[file.replace('.html.txt',''),fs.readFileSync(path.join(root,'test/fixtures',file),'utf8')]));
