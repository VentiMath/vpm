'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const v=require('..'),fixture=path.resolve(__dirname,'../../../scripts/minimatch-conformance'),u=require(fixture+'/node_modules/minimatch');
test('current upstream public pattern fixtures at all optimization levels',async()=>{
 const {default:patterns}=await import(fixture+'/patterns.mjs');let count=0;
 for(const c of patterns){if(typeof c==='function'){c();continue;}if(!Array.isArray(c))continue;
  const [pattern,,options,files]=c;for(const optimizationLevel of [0,1,2]){const o={...options,optimizationLevel};assert.deepEqual(v.match(files||patterns.files,pattern,o).sort(),u.match(files||patterns.files,pattern,o).sort(),JSON.stringify([pattern,o]));count++;}
 }assert.equal(count,588);
});
test('28,900 generated segment/path/negation/dot/partial comparisons',()=>{
 const paths=['','a','b','ab','abb','a.b','.ab','aaab','aaa','abc','x.ts','foo.js','x.test.ts','.x.ts','😀','é','a/b','a/b/c','a/','a/./b','a/../b','foo/bar.js','src/ui/a.tsx','functions/a.ts','https://api.example.org/x'];
 const tokens=['a','b','*','?','[ab]','[^a]','@(a|b)','?(a|b)','+(a|b)','*(a|b)','!(a|b)','@(.*|*)','!(*.test)','{a,b}','{001..102}','/','**'];let count=0;
 for(const a of tokens)for(const b of tokens)for(const o of [{nonegate:true},{nonegate:true,dot:true},{nonegate:true,nocase:true},{nonegate:true,partial:true}])for(const file of paths){const pattern=a+b;assert.equal(v(file,pattern,o),u.minimatch(file,pattern,o),JSON.stringify([file,pattern,o]));count++;}assert.equal(count,28900);
});
test('upstream tricky, nested and unfinished extglob regressions',()=>{
 let count=0;const t={equal(a,b,label){assert.equal(a,b,label);count++;},test(n,fn){fn(t)},plan(){},end(){},ok(a,l){this.equal(!!a,true,l)},notOk(a,l){this.equal(!!a,false,l)}};
 for(const name of ['tricky-negations.js','extglob-unfinished.js','negative-extglob-anchoring.js','extglob-ending-with-state-char.js']){
  const text=fs.readFileSync(fixture+'/upstream/'+name,'utf8').replace(/^import .+\n/gm,'');vm.runInNewContext(text,{minimatch:v,mm:v,t,test:t.test,process});
 }assert(count>=50);
});
test('Windows roots, Unicode, normalized segments, POSIX classes and literal escaping',()=>{
 const roots=require(fixture+'/windows-cases.json');
 for(const [file,pattern,expected,options] of roots)for(const backslash of [false,true]){const o={...options,platform:'win32'},f=backslash?file.replaceAll('/','\\'):file;assert.equal(v(f,pattern,o),expected,JSON.stringify([f,pattern,o]));}
 for(const normalize of [false,true,'NFC','NFD','NFKC','NFKD'])for(const [file,pattern]of [['a/café.js','**/café*'],['a／b','a/b'],['a／b','*'],['x/Ｘ','x/X']]){const o={normalize};assert.equal(v(file,pattern,o),u.minimatch(file,pattern,o),JSON.stringify([file,pattern,o]));}
 for(const p of ['[[:alpha:]]','[[:digit:]]','[[:punct:]]','[[:space:]]','[^[:upper:]]','[a-z]','[z-af]','[😀-🙏]'])for(const f of ['a','Z','é','ñ','1','٣','😀','😁',' ','\n','.','-'])for(const nocase of [false,true])assert.equal(v(f,p,{nocase}),u.minimatch(f,p,{nocase}),JSON.stringify([f,p,nocase]));
 for(const s of ['#x','!a','x[?]*()','a\\b','{a,b}','a/b','😀'])for(const windowsPathsNoEscape of [false,true])for(const magicalBraces of [false,true]){const o={windowsPathsNoEscape,magicalBraces};assert.equal(v.escape(s,o),u.escape(s,o));assert.equal(v.unescape(v.escape(s,o),o),u.unescape(u.escape(s,o),o));}
});
test('current numeric ranges, option snapshots, defaults, helpers and partial traversal',()=>{
 for(const p of ['a/{0..999}/b','file-{001..250}.txt','{-50..50}','x{0..99}{a,b}','{a,{0..999}}/b','*{100..199}','file-!({1..100}).txt','a!({1..100})','*({1..100})','+({-100..100})','x@(y|+({1..100}))','@({1..100}|x)','a?({1..100})'])for(const f of ['a/0/b','a/999/b','a/1000/b','a/05/b','file-001.txt','file-1.txt','-50','-0','0','50','x5b','500/b','x150','file-500.txt','a5','a','510','1000','-5-5','xy','x5','55','a101'])assert.equal(v(f,p),u.minimatch(f,p),JSON.stringify([f,p]));
 assert.equal(new v.Minimatch('a/{0..99}/b').set.length,1);assert.equal(new v.Minimatch('a/{0..98}/b').set.length,99);
 for(const o of [{},{dot:true},{nonegate:true},{noext:true},{noglobstar:true},{matchBase:true},{preserveMultipleSlashes:true},{nocaseMagicOnly:true,nocase:true}])for(const p of ['**/a','!a','@(a|b)','a//b','A','**'])for(const f of ['a','b','x/a','a/b','a//b','A','a/.x'])assert.equal(v(f,p,o),u.minimatch(f,p,o),JSON.stringify([f,p,o]));
 const d=v.defaults({dot:true}).defaults({nocase:true});assert(d('a/.X','**/*.x'));assert(new d.Minimatch('**/*.x').match('a/.X'));assert.deepEqual(['.a','b'].filter(d.filter('.*')),['.a']);assert.deepEqual(v.match(['a'],'x',{nonull:true}),['x']);
 const options={dot:false},m=new v.Minimatch('*',options);options.dot=true;assert.equal(m.match('.a'),false);
 for(const dot of ['.','..'])assert.equal(new v.Minimatch(dot,{nocase:true,platform:'linux'}).set[0][0],dot);
 assert(v('/','x',{partial:true}));assert(!v('.x','**/b',{partial:true}));assert(v('a/b','a/**/c',{partial:true}));
 assert(v.makeRe('**/*.ts') instanceof RegExp);assert(v.makeRe('**/*.ts').test('a/b.ts'));assert(!v.makeRe('**/*.ts').test('a/b.js'));
 const segment=new v.Minimatch('*.js').set[0][0];assert(segment instanceof RegExp);assert.equal(segment.test('a.js'),true);assert.equal(segment.testUnchecked('a.js'),true);assert.equal(segment.exec('a.js')[0],'a.js');
});
test('parent traversal and stable app patterns across current and historical controls',()=>{
 const patterns=['**/../x','**/../*/x','./**/../x','a/b/**/../x','*/../**','a/**/../../b','**/**/../*','./**','a/./b','a//b','a/**/b/**','**/..'];
 const paths=['x','a/x','a/b/x','a/b/c/x','../x','a/../x','a/b/../x','a/b/c/../x','b','./a','a/b','a/./b','a//b','a/b/','a/c/../../b'];
 for(const p of patterns)for(const f of paths)for(const optimizationLevel of [0,1,2]){const o={optimizationLevel};assert.equal(v(f,p,o),u.minimatch(f,p,o),JSON.stringify([f,p,o]));}
 for(const name of ['minimatch-five','minimatch-nine','minimatch-ten']){
  const api=require(fixture+'/node_modules/'+name),control=api.minimatch||api;
  for(const p of ['**/*.{ts,tsx}','{src,functions}/**/*.ts','src/**/!(*.test).tsx','**/*.@(js|ts)','api.example.org/**','https://**/*.json','**/v[12]/*.{json,yaml}','!**/*.test.ts','*.js','src/a[12].js'])for(const f of ['src/a.ts','src/ui/a.tsx','src/ui/a.test.tsx','functions/src/main.ts','src/.hidden.ts','src/a1.js','https://api.example.org/a.json','api.example.org/v1/a.yaml','foo.js','foo.test.ts'])for(const o of [{},{dot:true},{nocase:true},{matchBase:true}])assert.equal(v(f,p,o),control(f,p,o),JSON.stringify([name,f,p,o]));
 }
});
test('bounded interpreter handles deep, repeated and nonmatching patterns without regex backtracking',()=>{
 assert.equal(v('a'.repeat(2000)+'z','*a'.repeat(150)+'b'),false);
 const nested='@('.repeat(1500)+'a'+')'.repeat(1500);assert.equal(v('a',nested),true);assert.equal(v('b',nested),false);
 assert.equal(v('a'.repeat(101)+'z','*(a|i)'),false);
 assert.throws(()=>v('a'.repeat(10000)+'z','*?'.repeat(4000)),/work limit/);
 assert.throws(()=>new v.Minimatch('x'.repeat(65537)),/too long/);for(const p of [null,1,{},undefined])assert.throws(()=>new v.Minimatch(p),/invalid pattern/);
 assert.equal(v('a/999999999/b','a/{0..1000000000}/b'),true);assert.equal(v('a/1000000001/b','a/{0..1000000000}/b'),false);
});

test('noglobstar preserves the depth of consecutive wildcard segments', () => {
 for (const optimizationLevel of [0, 1, 2]) {
  const m = new v.Minimatch('a/**/**', { noglobstar: true, optimizationLevel });
  assert.equal(m.match('a/b/c'), true);
  assert.equal(m.match('a/b'), false);
  assert.equal(m.match('a/b/c/d'), false);
 }
});
