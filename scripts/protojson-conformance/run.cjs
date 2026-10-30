'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const snapshot=path.join(__dirname,'upstream'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vprotojson-tests-'));
try {
 for(const[file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
 fs.cpSync(path.join(snapshot,'test-fixtures'),path.join(temp,'test-fixtures'),{recursive:true});
 const compile=spawnSync('bun',[path.join(__dirname,'compile.cjs'),temp],{encoding:'utf8'});assert.equal(compile.status,0,compile.stdout+compile.stderr);
 const upstream=process.argv.includes('--upstream'),legacy=process.argv.includes('--legacy'),target=upstream?require.resolve('./node_modules/proto3-json-serializer'):require.resolve('../../packages/vproto3-json-serializer');
 fs.mkdirSync(path.join(temp,'build/src'),{recursive:true});for(const file of ['index','toproto3json','fromproto3json'])fs.writeFileSync(path.join(temp,'build/src',file+'.js'),'module.exports=require('+JSON.stringify(target)+');');
 fs.mkdirSync(path.join(temp,'node_modules'));for(const name of ['mocha'])fs.symlinkSync(path.join(__dirname,'node_modules',name),path.join(temp,'node_modules',name));
 fs.symlinkSync(legacy?path.join(__dirname,'node_modules/protobufjs'):path.resolve(__dirname,'../../packages/vprotobufjs'),path.join(temp,'node_modules/protobufjs'));
 const runner=`const Mocha=require('mocha'),fs=require('node:fs'),path=require('node:path');const mocha=new Mocha({reporter:'json'});for(const f of fs.readdirSync(__dirname+'/build/test/unit'))if(f!=='common.js'&&f.endsWith('.js'))mocha.addFile(__dirname+'/build/test/unit/'+f);mocha.run(n=>{process.exitCode=n?1:0;});`;
 fs.writeFileSync(path.join(temp,'run.cjs'),runner);
 const r=spawnSync(process.execPath,[path.join(temp,'run.cjs')],{encoding:'utf8',maxBuffer:8e6});
 const start=r.stdout.indexOf('{\n  "stats"'),report=start<0?null:JSON.parse(r.stdout.slice(start));
 if(!report){console.error(r.stdout,r.stderr);throw Error('No Mocha report');}
 const expected=[];
 for(const load of ['loadSync','fromJSON']) {
   if(!upstream)for(const value of ['NaN','Infinity','negative Infinity'])expected.push(`google.protobuf.Value ${load} test serializes ${value} to proto3 JSON`);
   if(!legacy)expected.push(`google.protobuf.Value ${load} test serializes google.protobuf.NullValue to proto3 JSON`);
 }
 assert.equal(report.stats.tests,316);assert.equal(report.stats.pending,0);
 assert.deepEqual(report.failures.map(f=>f.fullTitle).sort(),expected.sort(),'Unexpected upstream-suite difference');
 for(const f of report.failures)if(!f.fullTitle.includes('google.protobuf.NullValue'))assert.equal(f.err.message,'Value numbers must be finite');else {const stringify=require('./node_modules/mocha/lib/utils').stringify;assert.equal(f.err.actual,stringify({}));assert.equal(f.err.expected,stringify({nullValueField:null}));}
 assert.equal(r.status,expected.length?1:0);
 console.log(`${upstream?'Upstream':'VPM'} / protobuf ${legacy?'7.6.6':'8.8.1'}: ${report.stats.passes}/316 unchanged cases pass; ${expected.length} explicitly verified differences.`);
 if(!upstream)console.log('Six legacy expectations stringify nonfinite Value numbers; VPM rejects them with a tested error.');
 if(!legacy)console.log('Two legacy NullValue-presence expectations differ with protobuf 8 for both serializers.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
