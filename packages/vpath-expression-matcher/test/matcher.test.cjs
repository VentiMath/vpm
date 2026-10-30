'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Expression,ExpressionSet,Matcher,MatcherView}=require('..');
const at=(tags,attrs)=>{const m=new Matcher();for(const tag of tags)m.push(tag);if(attrs)m.updateCurrent(attrs);return m;};
test('retained upstream cases with documented contract corrections',async()=>{await require('../../../scripts/path-matcher-conformance/run.cjs')(false);});
test('pattern grammar, attribute separators and multi-character separators',()=>{
 const e=new Expression('root..ns::item[url=https://a.b/c?q=a=b]:nth(2)');
 assert.deepEqual(e.segments,[{type:'tag',tag:'root'},{type:'deep-wildcard'},{type:'tag',namespace:'ns',tag:'item',attrName:'url',attrValue:'https://a.b/c?q=a=b',position:'nth',positionValue:2}]);
 assert.equal(at(['a','b']).matches(new Expression('a=>b',{separator:'=>' })),true);
 assert.equal(at(['a','x','b']).matches(new Expression('a=>=>b',{separator:'=>' })),true);
 assert.equal(at(['item'],{url:'a.b'}).matches(new Expression('item[url=a.b]')),true);
 for(const pattern of ['a[','a]','a[]','a[x][y]','a[[x]]','a[x]junk','::a','n::n::a','a:last','a:nth(-1)','a:nth(9007199254740992)'])assert.throws(()=>new Expression(pattern),SyntaxError,pattern);
 for(const separator of ['',null,1,'[',':'])assert.throws(()=>new Expression('a',{separator}),TypeError);
 assert.throws(()=>new Expression(null),TypeError);
 assert.equal(new Expression('item').hasPositionSelector(),false);
});
test('root-anchored deep wildcard allows zero levels and retries repeated anchors',()=>{
 for(const [pattern,tags,expected]of [['..item',['item'],true],['root..item',['root','item'],true],['root..item',['other','root','item'],false],['a.b..c',['a','b','x','b','c'],true],['a..b..c',['a','b','c'],true],['..',[],true],['',[],false],['a..',['a'],true],['..a..b',['a','x','a','b'],true]])assert.equal(at(tags).matches(new Expression(pattern)),expected,pattern);
});
test('independent dynamic-programming matcher: 60,000 seeded paths and patterns',()=>{
 let seed=0x31415926;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>8)%n;};
 const parts=['a','b','*','.','a[x]','b[x=1]','*::a','n::b','a:first','b:odd','*:even','*:nth(1)'];
 function reference(segments,nodes){
  if(!segments.length)return false;
  const rows=Array.from({length:segments.length+1},()=>Array(nodes.length+1).fill(false));rows[0][0]=true;
  for(let s=1;s<=segments.length;s++)for(let p=0;p<=nodes.length;p++){
   const part=segments[s-1];if(part.type==='deep-wildcard'){rows[s][p]=rows[s-1][p]||(p>0&&rows[s][p-1]);continue;}
   if(!p)continue;const node=nodes[p-1];let match=(part.tag==='*'||part.tag===node.tag)&&(part.namespace===undefined||part.namespace==='*'||part.namespace===node.namespace);
   if(part.attrName!==undefined)match=match&&p===nodes.length&&Object.hasOwn(node.values||{},part.attrName)&&(part.attrValue===undefined||String(node.values[part.attrName])===part.attrValue);
   if(part.position!==undefined)match=match&&p===nodes.length&&(part.position==='first'?node.counter===0:part.position==='odd'?node.counter%2===1:part.position==='even'?node.counter%2===0:node.counter===part.positionValue);
   rows[s][p]=match&&rows[s-1][p-1];
  }
  return rows[segments.length][nodes.length];
 }
 for(let i=0;i<60000;i++){
  const m=new Matcher(),tags=[];for(let n=random(8);n>0;n--){const tag=random(2)?'a':'b',ns=random(3)?null:'n';if(random(2)){m.push(tag,null,ns);m.pop();}m.push(tag,{x:random(2)},ns);tags.push(tag);}
  const pieces=[];for(let n=random(8);n>0;n--)pieces.push(parts[random(parts.length)]);
  const expression=new Expression(pieces.join('.'));assert.equal(m.matches(expression),reference(expression.segments,m.path),`${expression} / ${tags}`);
 }
});
test('deep paths and repeated wildcards require no recursive call stack',()=>{
 const m=new Matcher();m.push('root');for(let i=0;i<15000;i++)m.push('a');m.push('end');
 assert.equal(m.matches(new Expression('root..a..end')),true);assert.equal(m.matches(new Expression('root..a..missing')),false);
});
test('own attributes, namespace counters, sibling positions and reset',()=>{
 const m=new Matcher();m.push('root');m.push('n:a');assert.equal(m.getCounter(),0);m.pop();m.push('a',Object.assign(Object.create({inherited:1}),{own:undefined}),'n');
 assert.equal(m.getCounter(),0);assert.equal(m.getPosition(),1);assert.equal(m.hasAttr('inherited'),false);assert.equal(m.getAttrValue('inherited'),undefined);assert.equal(m.hasAttr('own'),true);
 assert.equal(m.matches(new Expression('root.n::a[own]:first')),true);m.pop();m.push('a',{},'n');assert.equal(m.getCounter(),1);assert.equal(m.matches(new Expression('root.n::a:odd')),true);
 m.reset();m.push('a',{},'n');assert.equal(m.getCounter(),0);assert.equal(m.getPosition(),0);
});
test('only current attributes/positions match; explicit kept values outlive descent',()=>{
 const m=new Matcher();m.push('root',{id:1,empty:undefined},null,{keep:['id','empty']});m.push('child',{id:2});
 assert.equal(m.matches(new Expression('root[id].child')),false);assert.equal(m.matches(new Expression('root:first.child')),false);assert.equal(m.getAnyParentAttr('id'),1);assert.equal(m.hasAnyParentAttr('empty'),true);
 m.pop();assert.equal(m.hasAttr('id'),false);assert.equal(m.getAnyParentAttr('id'),1);m.pop();assert.equal(m.hasAnyParentAttr('id'),false);
});
test('push validates and reads kept getters before mutation',()=>{
 const m=at(['root'],{ok:true}),snapshot=m.snapshot();
 for(const action of [()=>m.push(1),()=>m.push('a',[]),()=>m.push('a',null,1),()=>m.push('a',null,null,{keep:[,]}),()=>m.push('a',{get x(){throw Error('getter');}},null,{keep:['x']})]){assert.throws(action);assert.deepEqual(m.snapshot(),snapshot);}
});
test('snapshot and inspection records are independent; nested values are shallow',()=>{
 const nested={},attrs={x:1,nested};Object.defineProperty(attrs,'hidden',{value:7,enumerable:false});const m=at(['root'],attrs),snapshot=m.snapshot();
 attrs.x=2;assert.equal(snapshot.path[0].values.x,1);assert.equal(snapshot.path[0].values.hidden,7);assert.equal(snapshot.path[0].values.nested,nested);
 m.restore(snapshot);snapshot.path[0].values.x=3;snapshot.siblingStacks[0].counts.set('root',99);assert.equal(m.getAttrValue('x'),1);
 const path=m.path;path[0].tag='changed';path[0].values.x=9;assert.equal(m.toString(),'root');assert.equal(m.getAttrValue('x'),1);
 m.pop();m.push('root');assert.equal(m.getCounter(),1);
});
test('restore validates atomically and maintains namespace and kept counters',()=>{
 const m=new Matcher();m.push('root',{x:1},null,{keep:['x']});m.push('child',{},'n');const saved=m.snapshot();m.pop();m.push('child',{},'n');assert.equal(m.getCounter(),1);m.restore(saved);m.pop();m.push('child',{},'n');assert.equal(m.getCounter(),1);assert.equal(m.getAnyParentAttr('x'),1);
 const baseline=m.snapshot();for(const bad of [null,{}, {...baseline,path:[,]}, {...baseline,siblingStacks:[,]}, {...baseline,keptAttrs:[,]}, {...baseline,siblingStacks:[{counts:new Map(),total:-1}]}]){assert.throws(()=>m.restore(bad),TypeError);assert.deepEqual(m.snapshot(),baseline);}
});
test('cached read-only view has no mutable matcher escape',()=>{
 const m=at(['root'],{x:1}),v=m.readOnly();assert.ok(v instanceof MatcherView);assert.equal(m.readOnly(),v);assert.equal(v._matcher,undefined);
 for(const name of ['push','pop','restore','reset','updateCurrent'])assert.equal(v[name],undefined);
 assert.throws(()=>{v.separator='/';},TypeError);assert.throws(()=>{delete v.separator;},TypeError);assert.throws(()=>{v.path[0].values.x=9;},TypeError);
 v.snapshot().path[0].tag='changed';assert.equal(v.toString(),'root');m.push('child');assert.equal(v.toString(),'root.child');assert.equal(v.toString('',false),'rootchild');
});
test('compiled patterns immutable; associated data remains writable',()=>{
 const e=new Expression('a',{},1);for(const edit of [()=>{e.pattern='b';},()=>{e.segments[0].tag='b';},()=>e.segments.push({}),()=>{e._hasDeepWildcard=true;}])assert.throws(edit,TypeError);
 e.data=2;assert.equal(e.data,2);assert.equal(e.toString(),'a');
});
test('sets retain bucket priority, separator identity, atomic addAll and private sealing',()=>{
 const set=new ExpressionSet(),deep=new Expression('..a'),wild=new Expression('*'),exact=new Expression('a');set.addAll([deep,wild,exact]);assert.equal(set.findMatch(at(['a'])),exact);assert.equal(set.findMatch(at(['b','a'])),deep);assert.equal(set.findMatch(at(['b','b'])),null);
 const mixed=new ExpressionSet().add(new Expression('a/b')).add(new Expression('a/b',{separator:'/'}));assert.equal(mixed.size,2);assert.equal(mixed.matchesAny(at(['a','b'])),true);mixed.add(new Expression('a/b'));assert.equal(mixed.size,2);
 for(const values of [[new Expression('valid'),{}],[new Expression('valid'),,]]){assert.throws(()=>mixed.addAll(values),TypeError);assert.equal(mixed.size,2);}
 mixed.seal();mixed._sealed=false;assert.throws(()=>mixed.add(new Expression('new')),/sealed/);assert.throws(()=>mixed.addAll([]),/sealed/);assert.equal(mixed.matchesAny(at(['a/b']).readOnly()),true);
});
test('CJS and ESM exports share constructors',async()=>{
 const esm=await import('../index.mjs'),cjs=require('..');assert.equal(esm.Matcher,cjs.Matcher);assert.equal(esm.default.ExpressionSet,cjs.ExpressionSet);
});
