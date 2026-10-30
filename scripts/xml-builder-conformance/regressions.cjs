'use strict';
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const capture=fn=>{try{return fn();}catch(error){return error.name+': '+error.message;}};
const cases=[
 ['single-character array name',B=>new B({arrayNodeName:'x'}).build([1,2]),'<x>1</x><x>2</x>'],
 ['null array item position',B=>new B().build({r:{x:['a',null,'b']}}),'<r><x>a</x><x/><x>b</x></r>'],
 ['Date array values',B=>new B().build({r:[new Date('2026-01-01T00:00:00Z')]}),'<r>'+String(new Date('2026-01-01T00:00:00Z'))+'</r>'],
 ['repeatable regex attribute filter',B=>{const b=new B({ignoreAttributes:[/^secret$/g]});return b.build({r:[{'@_secret':'a'},{'@_secret':'b'}]});},'<r></r><r></r>'],
 ['ordered selective attribute filter',B=>new B({preserveOrder:true,ignoreAttributes:['secret']}).build([{r:[],':@':{'@_secret':'a','@_keep':'b'}}]),'<r keep="b"></r>'],
 ['raw traversal depth budget',B=>capture(()=>new B({stopNodes:['r'],maxNestedTags:2}).build({r:{a:{b:'x'}}})),'Error: Maximum nested tags exceeded'],
 ['ordered raw depth budget',B=>capture(()=>new B({preserveOrder:true,stopNodes:['r'],maxNestedTags:2}).build([{r:[{a:[{b:[{'#text':'x'}]}]}]}])),'Error: Maximum nested tags exceeded'],
 ['empty-object depth boundary',B=>capture(()=>new B({maxNestedTags:1}).build({r:{}})),'<r></r>'],
 ['invalid sanitizer output',B=>capture(()=>new B({sanitizeName:()=>'<invalid>'}).build({'bad name':'x'})),'TypeError: sanitizeName must return a valid XML qualified name'],
 ['one processor call for text-only object',B=>{let n=0;const xml=new B({tagValueProcessor:(_,v)=>String(v)+ ++n}).build({r:{'#text':'x'}});return{xml,n};},{xml:'<r>x1</r>',n:1}],
 ['null-prototype grouped list',B=>capture(()=>{const row=Object.assign(Object.create(null),{'@':{id:'1'},x:'a'});return new B({oneListGroup:true,attributesGroupName:'@'}).build({r:[row]});}),'<r id="1"><x>a</x></r>'],
 ['escape processor object values',B=>new B({tagValueProcessor:()=>({toString:()=>'<injected>'})}).build({r:'x'}),'<r>&lt;injected&gt;</r>'],
 ['option array snapshot',B=>{const tags=[];const b=new B({unpairedTags:tags});tags.push('r');return b.build({r:''});},'<r></r>'],
 ['read-only callback path',B=>{let capability;new B({jPath:false,ignoreAttributes:(_,p)=>{capability=typeof p.reset;return false;}}).build({r:{'@_x':'y'}});return capability;},'undefined'],
 ['inherited text is not emitted',B=>new B().build({r:Object.assign(Object.create({'#text':'inherited'}),{child:'own'})}),'<r><child>own</child></r>'],
 ['unescaped predicate attribute',B=>new B({ignoreAttributes:false,stopNodes:[`r.raw[kind=a'b]`]}).build({r:{raw:{'@_kind':"a'b",'#text':'<raw>'}}}),'<r><raw kind="a&apos;b"><raw></raw></r>'],
 ['reject invalid depth option',B=>capture(()=>new B({maxNestedTags:NaN})),'RangeError: maxNestedTags must be a nonnegative safe integer'],
];
async function run(){
 const upstream=(await import(pathToFileURL(path.join(__dirname,'node_modules/fast-xml-builder/src/fxb.js')).href)).default,vpm=require('../../packages/vfast-xml-builder');
 const failures=[];
 for(const [name,fn,expected]of cases){const actual=capture(()=>fn(vpm)),control=capture(()=>fn(upstream));try{assert.deepEqual(actual,expected);assert.notDeepEqual(control,expected);}catch(error){failures.push({name,actual,expected,control});}}
 assert.deepEqual(failures,[]);console.log(`${cases.length} paired upstream/VPM XML builder discriminators passed.`);
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
