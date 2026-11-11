"use strict";
const {test} = require('node:test'), assert = require('node:assert/strict');
const {css,extractCss} = require(process.env.VGOOBER_ENTRY || '../index.cjs');
function scope() { const target={data:''};return {target,css:css.bind({target}),take:()=>extractCss(target)}; }
test('object declarations keep order, numeric units, vendor prefixes and variables',()=>{
 const a=scope(),name=a.css({display:'flex',flexGrow:1,margin:0,WebkitUserSelect:'none',msUserSelect:'none','--Theme':'blue'});
 assert.equal(a.take(),`.${name}{display:flex;flex-grow:1;margin:0;-webkit-user-select:none;-ms-user-select:none;--Theme:blue;}`);
});
test('nested selectors and media keep outer declarations before children',()=>{
 const a=scope(),name=a.css({color:'red','&:hover,&:focus':{color:'blue'},background:'white','@media (min-width:600px)':{display:'flex','.child':{padding:'1px'}}});
 assert.equal(a.take(),`.${name}{color:red;background:white;}.${name}:hover,.${name}:focus{color:blue;}@media (min-width:600px){.${name}{display:flex;}.${name} .child{padding:1px;}}`);
});
test('commas inside selector functions and quoted attributes do not split selectors',()=>{
 const a=scope(),name=a.css({':is(a,b),[data-x="a,b"]':{color:'red'}});
 assert.equal(a.take(),`.${name} :is(a,b),.${name} [data-x="a,b"]{color:red;}`);
});
test('style arrays merge declarations and nested maps without modifying input',()=>{
 const a=scope(),one=Object.freeze({color:'red','&:hover':Object.freeze({color:'blue'})}),two={color:'green','&:hover':{opacity:.5}};
 const name=a.css([one,null,false,[two]]);assert.equal(a.take(),`.${name}{color:green;}.${name}:hover{color:blue;opacity:0.5;}`);assert.equal(one.color,'red');
});
test('equal content deduplicates, extraction resets, mutations produce new rules',()=>{
 const a=scope(),obj={color:'red'},x=a.css(obj);assert.equal(a.css({...obj}),x);assert.equal(a.take(),`.${x}{color:red;}`);
 assert.equal(a.css(obj),x);assert.ok(a.take());obj.color='blue';assert.notEqual(a.css(obj),x);
});
test('stylesheets are isolated per server target and default extraction clears',()=>{
 const a=scope(),b=scope(),name=a.css({color:'red'});assert.equal(b.take(),'');assert.equal(b.css({color:'red'}),name);assert.ok(a.take());assert.ok(b.take());
 extractCss();css({color:'blue'});assert.ok(extractCss());assert.equal(extractCss(),'');
});
test('null and false values are omitted without discarding numeric zero',()=>{
 const a=scope(),name=a.css({display:null,color:false,opacity:0,padding:undefined});assert.equal(a.take(),`.${name}{opacity:0;}`);
});
test('inherited properties do not leak into output and null-prototype objects work',()=>{
 const a=scope(),obj=Object.assign(Object.create({color:'red'}),{opacity:0});const name=a.css(obj);assert.equal(a.take(),`.${name}{opacity:0;}`);assert.equal(a.css(Object.assign(Object.create(null),{opacity:0})),name);
});
test('invalid input fails before inserting any CSS',()=>{
 const a=scope();for(const value of [{color:'red','&':{opacity:Infinity}},{color:['red','blue']},{constructor:'red'},{'color;':1},'color:red',{x:()=>1},{'@font-face':{fontFamily:'x'}}])assert.throws(()=>a.css(value));assert.equal(a.take(),'');
});
test('cycles and excessive nesting fail predictably',()=>{
 const a=scope(),obj={};obj['&']=obj;assert.throws(()=>a.css(obj),/cyclic/);let deep={color:'red'};for(let i=0;i<130;i++)deep={'&':deep};assert.throws(()=>a.css(deep),/128/);assert.equal(a.take(),'');
});
test('shared acyclic subtrees are valid and getter failures leave target intact',()=>{
 const a=scope(),shared={color:'red'};a.css({'.a':shared,'.b':shared});const before=a.target.data;
 assert.throws(()=>a.css({get color(){throw Error('getter');}}),/getter/);assert.equal(a.target.data,before);
});
test('malformed selectors reject and strings containing null reject',()=>{
 const a=scope();for(const key of ['&:is(','&,,span',']'])assert.throws(()=>a.css({[key]:{color:'red'}}));assert.throws(()=>a.css({content:'\0'}));
});
test('target validation is explicit',()=>{
 assert.throws(()=>css.call({target:{}},{color:'red'}),/data string/);assert.throws(()=>extractCss(1),/target/);
});

test('literal ampersands in selectors remain literal',()=>{
 const a=scope(),name=a.css({'&[data-x="&"]':{color:'red'}});
 assert.equal(a.take(),`.${name}[data-x="&"]{color:red;}`);
});
