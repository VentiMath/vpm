'use strict';

// Independent persistent AVL index for Watch document keys. Updates copy only
// the search path; old snapshots retain their original root and document order.
const size = n => n === null ? 0 : n.size;
const height = n => n === null ? 0 : n.height;
function node(key, left=null, right=null) {
  return {key,left,right,size:1+size(left)+size(right),height:1+Math.max(height(left),height(right))};
}
function rotateLeft(n) { const r=n.right; return node(r.key,node(n.key,n.left,r.left),r.right); }
function rotateRight(n) { const l=n.left; return node(l.key,l.left,node(n.key,l.right,n.right)); }
function balanced(key, left, right) {
  let n=node(key,left,right);
  const skew=height(left)-height(right);
  if(skew>1){if(height(left.right)>height(left.left))n=node(key,rotateLeft(left),right);return rotateRight(n)}
  if(skew< -1){if(height(right.left)>height(right.right))n=node(key,left,rotateRight(right));return rotateLeft(n)}
  return n;
}
function add(n,key,compare,result,offset) {
  if(n===null){result.index=offset;return node(key)}
  const order=compare(key,n.key);
  if(order<0)return balanced(n.key,add(n.left,key,compare,result,offset),n.right);
  if(order>0)return balanced(n.key,n.left,add(n.right,key,compare,result,offset+size(n.left)+1));
  // Watch has one document per comparator key; a replacement keeps its rank.
  result.index=offset+size(n.left);
  return node(key,n.left,n.right);
}
function removeMin(n) {
  if(n.left===null)return n.right;
  return balanced(n.key,removeMin(n.left),n.right);
}
function erase(n,key,compare,result,offset) {
  if(n===null)return null;
  const order=compare(key,n.key);
  if(order<0){const left=erase(n.left,key,compare,result,offset);return left===n.left?n:balanced(n.key,left,n.right)}
  if(order>0){const right=erase(n.right,key,compare,result,offset+size(n.left)+1);return right===n.right?n:balanced(n.key,n.left,right)}
  result.index=offset+size(n.left);
  if(n.left===null)return n.right;
  if(n.right===null)return n.left;
  let next=n.right;while(next.left!==null)next=next.left;
  return balanced(next.key,n.left,removeMin(n.right));
}
function collect(n,keys,offset) {
  if(n===null)return;
  const at=offset+size(n.left);
  keys[at]=n.key;
  collect(n.left,keys,offset);collect(n.right,keys,at+1);
}
class SnapshotIndex {
  #root;
  #compare;
  constructor(compare,root=null) {
    if(typeof compare!=='function')throw new TypeError('SnapshotIndex requires a comparator');
    this.#compare=compare;this.#root=root;
  }
  get length(){return size(this.#root)}
  insert(key) {
    const result={index:0,tree:null};
    const root=add(this.#root,key,this.#compare,result,0);
    result.tree=new SnapshotIndex(this.#compare,root);return result;
  }
  remove(key) {
    const result={index:this.length,tree:this};
    const root=erase(this.#root,key,this.#compare,result,0);
    if(root!==this.#root)result.tree=new SnapshotIndex(this.#compare,root);
    return result;
  }
  forEach(visit) {
    const stack=[];let current=this.#root;
    while(current!==null||stack.length){
      while(current!==null){stack.push(current);current=current.left}
      current=stack.pop();const stop=visit(current.key);if(stop)return stop;
      current=current.right;
    }
  }
  get keys(){const keys=new Array(this.length);collect(this.#root,keys,0);return keys}
}
module.exports={SnapshotIndex};
