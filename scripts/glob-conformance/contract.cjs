'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const vpm = require(process.env.VPM_GLOB_PACKAGE || '../../packages/vglob');
const controls = ['glob', 'glob-app', 'glob-ten'].map(name => [name, require(name)]);
const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vglob-contract-')));
const norm = rows => Array.from(rows, x => typeof x === 'string' ? x : x.fullpath()).sort();
const patterns = ['**', './**', '**/*', 'a/**', 'a/**/**', 'a/**/c.txt', 'a/../**', 'link/**', '**/link/**', '*/*', 'link/', '.', 'a', 'a/', './a/../a/*', '**/*.{js,ts}', '**/../*.js', [], ['a', 'a/**'], '!a', '#hash', '**/.*', 'a/+(b|x)/*', '**/!(d).js', '**/[cd]*', '*.js', '', '**/FILE*', 'caf*', 'caf\u00e9*'];
const options = [{}, {dot:true}, {mark:true}, {nodir:true}, {follow:true}, {nodir:true,follow:true}, {absolute:true}, {absolute:false}, {realpath:true}, {dotRelative:true}, {ignore:'a/b/**'}, {ignore:'**/*.js'}, {includeChildMatches:false}, {maxDepth:1}, {maxDepth:0}, {maxDepth:-1}, {maxDepth:3}, {withFileTypes:true}, {stat:true,withFileTypes:true}, {nocase:true}, {platform:'linux',nocase:true}, {noglobstar:true}, {noext:true}, {nobrace:true}, {matchBase:true}];
(async () => { try {
  for (const name of ['a/b/c.txt','a/b/d.js','a/b/.hide','a/c.js','a/x/z.txt','.h/f.js','c.ts','FILE.txt','#hash','!a','cafe\u0301.txt']) {
    fs.mkdirSync(path.dirname(cwd+'/'+name),{recursive:true}); fs.writeFileSync(cwd+'/'+name,'data');
  }
  fs.symlinkSync('a', cwd+'/link'); fs.symlinkSync('no', cwd+'/broken');
  let checks=0;
  for (const [version, control] of controls) {
    for (const pattern of [...patterns, cwd+'/a/**/*.js', cwd+'/a/']) for (const option of options) {
      const opts={cwd,...option}, label=JSON.stringify([version,pattern,option]);
      const expected=norm(control.globSync(pattern,opts));
      assert.deepEqual(norm(vpm.globSync(pattern,opts)),expected,label+' sync'); checks++;
      assert.deepEqual(norm(await vpm.glob(pattern,opts)),expected,label+' async'); checks++;
    }
    for (const pattern of patterns.slice(0,15)) for (const option of [{},{nodir:true},{withFileTypes:true},{ignore:'a/b/**'}]) {
      const opts={cwd,...option}, expected=norm(control.globSync(pattern,opts));
      for (const stream of [vpm.globStream(pattern,opts),vpm.globStreamSync(pattern,opts)]) { assert.deepEqual(norm(await stream.collect()),expected); checks++; }
      const g=new vpm.Glob(pattern,opts); assert.deepEqual(norm([...g]),expected); checks++;
      const rows=[]; for await(const row of new vpm.Glob(pattern,g)) rows.push(row); assert.deepEqual(norm(rows),expected); checks++;
    }
  }
  for (const opts of [{normalize:true},{normalize:'NFD'}, {ignore:'caf\u00e9*',normalize:true}, {root:cwd+'/a'}, {root:cwd+'/a',absolute:false}, {ignore:{ignored:p=>p.name==='d.js',childrenIgnored:p=>p.name==='x'}}]) {
    for(const pattern of ['**','caf\u00e9*','/*.js']) { const options={cwd,...opts}; assert.deepEqual(norm(vpm.globSync(pattern,options)),norm(controls[0][1].globSync(pattern,options))); checks++; }
  }
  console.log(`${checks} glob 14 / app 13 / backend 10 differential checks pass.`);
} finally { fs.rmSync(cwd,{recursive:true,force:true}); } })().catch(e=>{console.error(e);process.exitCode=1;});
