import {createSelector,createSelectorCreator,createStructuredSelector,lruMemoize,weakMapMemoize,setGlobalDevModeChecks} from 'vreselect';
interface State {items:{id:number;name:string}[];count:number}
const select=createSelector([(s:State)=>s.items,(_:State,id:number)=>id],(items,id)=>items.find(x=>x.id===id));
const item=select({items:[],count:0},1);const name:string|undefined=item?.name;
select.clearCache();select.memoizedResultFunc.clearCache();const count:number=select.recomputations();void count;void name;
// @ts-expect-error id must be numeric
select({items:[],count:0},'one');
// @ts-expect-error state must contain items
select({count:0},1);
const typed=createSelector.withTypes<State>();
const names=typed([s=>s.items],items=>items.map(x=>x.name));const list:string[]=names({items:[],count:0});void list;
const variadic=createSelector((s:State)=>s.count,(_:State,id:string)=>id,(n,id)=>id+n);const value:string=variadic({items:[],count:2},'amc');void value;
const creator=createSelectorCreator({memoize:lruMemoize,memoizeOptions:{maxSize:2,equalityCheck:Object.is}});
creator([(s:State)=>s.count],n=>n*2)({items:[],count:2});
const structured=createStructuredSelector.withTypes<State>()({count:s=>s.count,names:s=>s.items.map(x=>x.name)});
const fields=structured({items:[],count:0});const n:number=fields.count;const ns:string[]=fields.names;void n;void ns;
const cached=weakMapMemoize((x:number)=>String(x),{maxSize:10});const str:string=cached(1);void str;cached.clearCache();
// @ts-expect-error memoized argument is retained
cached('bad');
// @ts-expect-error maxSize must be numeric
weakMapMemoize(()=>1,{maxSize:'10'});
setGlobalDevModeChecks({inputStabilityCheck:'always',cacheSizeCheck:'never'});
// @ts-expect-error invalid frequency
setGlobalDevModeChecks({cacheSizeCheck:'sometimes'});
