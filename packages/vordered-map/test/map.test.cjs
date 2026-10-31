'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{OrderedMap}=require('..');

test('forward/reverse bounds, writable live pairs, copies and independent snapshots',()=>{
  const m=new OrderedMap([[3,'c'],[1,'a'],[2,'b']]);
  assert.deepEqual([...m],[[1,'a'],[2,'b'],[3,'c']]);
  const iter=m.begin(),pair=iter.pointer;
  assert.equal(iter.pointer,pair);assert.ok(Array.isArray(pair));
  pair[1]='A';assert.equal(m.getElementByKey(1),'A');
  assert.throws(()=>{pair[0]=9;},TypeError);
  const copy=iter.copy();assert.equal(iter.next(),iter);assert.deepEqual([...pair],[2,'b']);
  assert.equal(copy.pointer[0],1);assert.equal(m.end().pre().pointer[0],3);
  assert.equal(m.rEnd().pre().pointer[0],1);
  const reverse=[];for(const i=m.rBegin();!i.equals(m.rEnd());i.next())reverse.push(i.pointer[0]);
  assert.deepEqual(reverse,[3,2,1]);
  for(const [method,key,want] of [['lowerBound',2,2],['upperBound',2,3],['reverseLowerBound',2,2],['reverseUpperBound',2,1]]) assert.equal(m[method](key).pointer[0],want);
  assert.ok(m.lowerBound(4).equals(m.end()));assert.ok(m.reverseLowerBound(0).equals(m.end()));
  const front=m.front();front[1]='outside';assert.equal(m.front()[1],'A');
  const visited=[];m.forEach((entry,index,map)=>{assert.equal(map,m);visited.push([index,...entry]);});
  assert.deepEqual(visited,[[0,1,'A'],[1,2,'b'],[2,3,'c']]);
});

test('foreign iterators cannot mutate either map, including hints and end markers',()=>{
  for(const method of ['setElement','eraseElementByIterator','updateKeyByIterator']) {
    const a=new OrderedMap([[1,'a'],[3,'c']]),b=new OrderedMap([[2,'b']]);
    const beforeA=[...a],beforeB=[...b];
    for(const iter of [b.begin(),b.end(),{},null]) {
      assert.throws(()=>method==='setElement'?a[method](2,'new',iter):a[method](iter,2),TypeError);
      assert.deepEqual([...a],beforeA);assert.deepEqual([...b],beforeB);
    }
  }
});

test('detached and cleared iterators, including retained pairs and copied iterators, are rejected',()=>{
  for(const remove of [m=>m.eraseElementByKey(1),m=>m.clear()]) {
    const m=new OrderedMap([[2,'b'],[1,'a'],[3,'c']]),i=m.begin(),pair=i.pointer;
    remove(m);m.setElement(4,'d');
    assert.equal(i.isAccessible(),false);
    for(const operation of [()=>i.pointer,()=>i.next(),()=>i.pre(),()=>i.copy().pointer,()=>pair[0],()=>{pair[1]='bad';},()=>m.setElement(2,'bad',i),()=>m.eraseElementByIterator(i),()=>m.updateKeyByIterator(i,7)]) assert.throws(operation,RangeError);
    assert.equal(m.getElementByKey(4),'d');
  }
});

test('end access cannot poison missing lookups through a previously retained pair',()=>{
  const m=new OrderedMap([[1,'a']]),i=m.begin(),p=i.pointer;i.next();
  assert.throws(()=>p[1],RangeError);assert.throws(()=>{p[1]='poison';},RangeError);
  assert.equal(m.getElementByKey(999),undefined);
  for(const i of [m.end(),new OrderedMap().begin(),new OrderedMap().rBegin()]) {
    assert.throws(()=>i.next(),RangeError);
  }
  assert.throws(()=>new OrderedMap().end().pre(),RangeError);
  assert.throws(()=>new OrderedMap().rEnd().pre(),RangeError);
});

test('positions reject nonintegers without mutation; optional rank lookup survives deletion',()=>{
  for(const indexed of [false,true]) {
    const singleton=new OrderedMap([[1,'only']],undefined,indexed);
    assert.throws(()=>singleton.eraseElementByPos(NaN),RangeError);
    assert.deepEqual([...singleton],[[1,'only']]);
    const m=new OrderedMap([[5,5],[1,1],[4,4],[2,2],[3,3]],undefined,indexed);
    for(const pos of [-1,5,.5,NaN,Infinity,'1',null,undefined]) {
      assert.throws(()=>m.getElementByPos(pos),RangeError);assert.throws(()=>m.eraseElementByPos(pos),RangeError);
      assert.equal(m.size(),5);
    }
    assert.deepEqual(m.getElementByPos(3),[4,4]);assert.equal(m.eraseElementByPos(3),4);
    assert.deepEqual([...m],[[1,1],[2,2],[3,3],[5,5]]);
    if(indexed) m.forEach(([k],i)=>assert.equal(m.find(k).index,i));
    else assert.throws(()=>m.begin().index,RangeError);
  }
});

test('erase-by-iterator advances the same iterator in either direction through the final entry',()=>{
  for(const reverse of [false,true]) {
    const m=new OrderedMap(Array.from({length:80},(_,i)=>[i,i]),undefined,true),i=reverse?m.rBegin():m.begin();
    for(let n=0;n<80;n++) {assert.equal(i.pointer[0],reverse?79-n:n);assert.equal(m.eraseElementByIterator(i),i);}
    assert.ok(i.equals(reverse?m.rEnd():m.end()));assert.equal(m.empty(),true);
    assert.throws(()=>i.pointer,RangeError);
  }
});

test('tree balance and indexed sizes survive deterministic mixed mutations',()=>{
  let seed=123456;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  for(const indexed of [false,true]) {
    const m=new OrderedMap([],undefined,indexed),oracle=new Map();
    function check(node,parent) {
      if(!node)return {black:1,size:0};
      assert.equal(node._parent,parent);
      const l=check(node._left,node),r=check(node._right,node);
      assert.equal(l.black,r.black);
      if(node._color===1){assert.notEqual(node._left?._color,1);assert.notEqual(node._right?._color,1);}
      const size=l.size+r.size+1;if(indexed)assert.equal(node._subTreeSize,size);
      return {black:l.black+(node._color===0?1:0),size};
    }
    for(let step=0;step<5000;step++) {
      const key=random()%200;
      if(random()%3){m.setElement(key,step);oracle.set(key,step);}else assert.equal(m.eraseElementByKey(key),oracle.delete(key));
      if(step%31===0) {
        const want=[...oracle].sort((a,b)=>a[0]-b[0]);assert.deepEqual([...m],want);
        if(m._root)assert.equal(m._root._color,0);
        assert.equal(check(m._root,m._header).size,m.size());
        if(indexed)want.forEach(([key],i)=>{assert.equal(m.find(key).index,i);assert.deepEqual(m.getElementByPos(i),want[i]);});
      }
    }
  }
});
