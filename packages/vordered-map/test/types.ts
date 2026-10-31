import {OrderedMap, type OrderedMapIterator, type TreeContainer, type Container} from '..';
const map = new OrderedMap<number, {name:string}>([[1,{name:'first'}]],(a,b)=>a-b,true);
const iter:OrderedMapIterator<number,{name:string}> = map.lowerBound(1);
const name:string=iter.pointer[1].name;
iter.pointer[1]={name:'updated'};
const size:number=map.setElement(2,{name},iter);
const rank:number=iter.index;
map.forEach(([key,value],index,owner)=>{const k:number=key;const v:string=value.name;void[k,v,index,owner];});
const tree:TreeContainer<number,{name:string}>=map;
const container:Container<number | [number,{name:string}]>=tree;
const inferred=new OrderedMap([[1,'one'],[2,'two']]);
const inferredValue:string|undefined=inferred.getElementByKey(1);
const readonlyPairs=[[1,{name:'readonly input'}]] as const;
new OrderedMap(readonlyPairs);
map.eraseElementByIterator(iter.copy());
// @ts-expect-error string keys are not valid for this map
map.setElement('wrong',{name});
// @ts-expect-error values must contain a name
map.setElement(3,{});
void[size,rank,container,inferredValue];
