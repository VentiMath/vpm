'use strict';
const assert=require('node:assert/strict');
const rejected=fn=>{try{fn();return false;}catch{return true;}};
const cases=[
 ['exact paired depth',A=>rejected(()=>new A.XMLParser({maxNestedTags:1}).parse('<r><x>v</x></r>')),true],
 ['self-closing depth',A=>rejected(()=>new A.XMLParser({maxNestedTags:1}).parse('<r><x/></r>')),true],
 ['reject NaN depth',A=>rejected(()=>new A.XMLParser({maxNestedTags:NaN})),true],
 ['reject fractional entity limit',A=>rejected(()=>new A.XMLParser({processEntities:{maxEntityCount:1.5}})),true],
 ['one transform per self-closing tag',A=>new A.XMLParser({transformTagName:n=>'v'+n}).parse('<r/>'),{vr:''}],
 ['stable global attribute filter',A=>new A.XMLParser({ignoreAttributes:[/^id$/g]}).parse('<r><x id="1"/><x id="2"/></r>'),{r:{x:['','']}}],
 ['safe dangerous-name callback',A=>rejected(()=>new A.XMLParser({onDangerousProperty:()=> 'constructor'}).parse('<toString>x</toString>')),true],
 ['safe updated name',A=>rejected(()=>new A.XMLParser({updateTag:()=> 'constructor'}).parse('<r/>')),true],
 ['safe callback-added attributes',A=>rejected(()=>new A.XMLParser({updateTag:(n,p,a)=>{Object.defineProperty(a,'__proto__',{value:{injected:true},enumerable:true});}}).parse('<r/>')),true],
 ['attribute filter snapshot',A=>{const opts={ignoreAttributes:['id']},p=new A.XMLParser(opts);opts.ignoreAttributes.length=0;return p.parse('<r id="1"/>');},{r:''}],
 ['no arbitrary input coercion',A=>rejected(()=>new A.XMLParser().parse({toString:()=>'<r/>'})),true],
 ['XML Name supports supplementary letters',A=>A.XMLValidator.validate('<𐀀/>'),true],
 ['DTD Name permits multiple colons',A=>new A.XMLParser().parse('<!DOCTYPE r [<!ENTITY a:b:c "v">]><r>&a:b:c;</r>'),{r:'v'}],
 ['grouped XML declaration version',A=>new A.XMLParser({attributesGroupName:'attrs',htmlEntities:true,ignoreDeclaration:true}).parse('<?xml version="1.1"?><r>&#x1;</r>'),{r:'\x01'}],
 ['other PI does not change XML version',A=>new A.XMLParser({htmlEntities:true,ignorePiTags:true}).parse('<?xml version="1.1"?><?style version="1.0"?><r>&#x1;</r>'),{r:'\x01'}],
];
for(const xml of ['<r/><s/>','<r/>text','<r __proto__="a" __proto__="b"/>','<r a="foo&ampbar&apos;"/>','<r a="<"/>','<r a="&missing"/>','<r>&#;</r>','<r>&#x;</r>','<r>&#0;</r>','<r>&#xD800;</r>','<r>&#x110000;</r>','<r/><!--unclosed','<r/><?unclosed','<r/><![CDATA[unclosed','<r/','<r a="x" = />','<r><!--a--b--></r>']) cases.push(['reject malformed '+xml,A=>A.XMLValidator.validate(xml)!==true,true]);
for(const xml of ['<r>&long.entity-name.with.dots;</r>','<r>&é;</r>','<!DOCTYPE r SYSTEM "a>b"><r/>']) cases.push(['accept valid '+xml,A=>A.XMLValidator.validate(xml),true]);
async function run(){
 const upstream=require('./node_modules/fast-xml-parser'),vpm=require('../../packages/vfast-xml-parser'),failures=[];
 for(const [name,fn,expected]of cases){let actual,control;try{actual=fn(vpm);}catch(e){actual=e.message;}try{control=fn(upstream);}catch(e){control=e.message;}try{assert.deepEqual(actual,expected);assert.notDeepEqual(control,expected);}catch{failures.push({name,actual,expected,control});}}
 assert.deepEqual(failures,[]);console.log(`${cases.length} paired upstream/VPM XML parser discriminators passed.`);
}
module.exports={run,cases};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
