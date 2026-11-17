'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),parse=require(process.env.VPARSER_ENTRY||'..');
test('preserves deep values without recursive parser/walker/serializer stacks',()=>{
 const text='f('.repeat(20000)+'1px'+')'.repeat(20000),p=parse(text);let count=0;p.walk(()=>{count++});assert.equal(count,20001);assert.equal(p.toString(),text);count=0;p.walk(()=>{count++},true);assert.equal(count,20001);
});
test('malformed input preserves all source bytes and bounded offsets',()=>{
 for(const text of ['/*/','f(url(x','"x\\', 'calc() a / b','f(, )']){const p=parse(text);assert.equal(p.toString(),text);p.walk(n=>{assert(n.sourceEndIndex<=text.length);assert(n.sourceIndex<=n.sourceEndIndex);});}
 assert.equal(parse('/*/').nodes[0].unclosed,true);assert.equal(parse('/*/').nodes[0].value,'/');
});
test('mutable visitor, skipping and postorder',()=>{
 const p=parse('f(g(2px))');const seen=[];assert.equal(p.walk(n=>{seen.push(n.value);return false}),p);assert.deepEqual(seen,['f']);
 const post=[];p.walk(n=>{post.push(n.value);if(n.type==='word')n.value='3px'},true);assert.deepEqual(post,['2px','g','f']);assert.equal(p.toString(),'f(g(3px))');
 assert.equal(parse.stringify(p.nodes,n=>n.value==='g'?'blue':undefined),'f(blue)');
});
test('quoted URLs, escape parity, units, and independent nodes',()=>{
 const a=parse('url("a)b")'),b=parse('url("a)b")');assert.notEqual(a.nodes[0],b.nodes[0]);assert.equal(a.toString(),'url("a)b")');assert.deepEqual(parse.unit('-1.2e+3px'),{number:'-1.2e+3',unit:'px'});assert.equal(parse.unit('auto'),false);
});
