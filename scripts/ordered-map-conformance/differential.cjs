'use strict';
const assert=require('node:assert/strict'),upstream=require('@js-sdsl/ordered-map'),vpm=require('../../packages/vordered-map');
let seed=0x51d51,operations=0;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const snapshot=i=>i.isAccessible()?[...i.pointer]:null;
for(const indexed of [false,true])for(const cmp of [undefined,(a,b)=>b-a]) {
  const a=new upstream.OrderedMap([],cmp,indexed),b=new vpm.OrderedMap([],cmp,indexed);
  for(let step=0;step<12000;step++) {
    const key=random()%256,op=random()%10;
    if(op<4)assert.equal(a.setElement(key,step,a.lowerBound(key)),b.setElement(key,step,b.lowerBound(key)));
    else if(op===4)assert.equal(a.eraseElementByKey(key),b.eraseElementByKey(key));
    else if(op===5&&a.size()) {const pos=random()%a.size();assert.deepEqual(a.getElementByPos(pos),b.getElementByPos(pos));assert.equal(a.eraseElementByPos(pos),b.eraseElementByPos(pos));}
    else if(op===6)assert.equal(a.getElementByKey(key),b.getElementByKey(key));
    else if(op===7&&a.size()) {
      const pos=random()%a.size(),k=a.getElementByPos(pos)[0],reverse=!!(random()%2);
      const ia=reverse?a.rBegin():a.find(k),ib=reverse?b.rBegin():b.find(k);
      assert.deepEqual(snapshot(a.eraseElementByIterator(ia)),snapshot(b.eraseElementByIterator(ib)));
    } else if(op===8&&a.size()) {
      const k=a.front()[0],next=key+.5;
      assert.equal(a.updateKeyByIterator(a.find(k),next),b.updateKeyByIterator(b.find(k),next));
    } else {
      const entries=[[key,step],[key+100,step+1]];
      assert.equal(a.union(new upstream.OrderedMap(entries)),b.union(new vpm.OrderedMap(entries)));
    }
    operations++;
    if(step%37===0) {
      assert.deepEqual([...a],[...b]);assert.equal(a.size(),b.size());assert.equal(a.getHeight(),b.getHeight());
      for(const bound of ['find','lowerBound','upperBound','reverseLowerBound','reverseUpperBound']) {
        assert.deepEqual(snapshot(a[bound](key)),snapshot(b[bound](key)));operations++;
      }
      if(indexed) {const ia=a.begin(),ib=b.begin();while(!ia.equals(a.end())){assert.equal(ia.index,ib.index);ia.next();ib.next();}}
    }
  }
}
// Demonstrate fixes with original-package controls, without invoking upstream's
// unsafe foreign-node erase (which can loop indefinitely).
const original=new upstream.OrderedMap([[1,'a']]),fixed=new vpm.OrderedMap([[1,'a']]);
for(const [lib,map]of [[upstream,original],[vpm,fixed]]) {
  const foreign=new lib.OrderedMap([[9,'other']]);
  if(lib===upstream){assert.equal(map.updateKeyByIterator(foreign.begin(),7),true);assert.equal(foreign.front()[0],7);}
  else {assert.throws(()=>map.updateKeyByIterator(foreign.begin(),7),TypeError);assert.equal(foreign.front()[0],9);}
  const i=map.begin(),pair=i.pointer;i.next();
  if(lib===upstream){pair[1]='poison';assert.equal(map.getElementByKey(999),'poison');}
  else {assert.throws(()=>{pair[1]='poison';},RangeError);assert.equal(map.getElementByKey(999),undefined);}
}
assert.equal(new upstream.OrderedMap([[1,1],[2,2],[3,3]]).rEnd().pre().pointer[0],3);
assert.equal(new vpm.OrderedMap([[1,1],[2,2],[3,3]]).rEnd().pre().pointer[0],1);
const originalSingle=new upstream.OrderedMap([[1,'only']]),fixedSingle=new vpm.OrderedMap([[1,'only']]);
assert.equal(originalSingle.eraseElementByPos(NaN),0);
assert.throws(()=>fixedSingle.eraseElementByPos(NaN),RangeError);
assert.deepEqual([...fixedSingle],[[1,'only']]);
console.log(`${operations} deterministic mixed operations/bounds match upstream; four original-package bug controls reproduced.`);
