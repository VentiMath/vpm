import define from '../index.cjs';
const symbol=Symbol('lazy');const base={label:'ready'};
const target=define(base,'value',()=>({n:3}));const n:number=target.value.n;target.value={n:4};
const label:string=target.label;const keyed=define(base,symbol,()=>12);const num:number=keyed[symbol];
const numeric=define({},5,()=>false);const flag:boolean=numeric[5];
// @ts-expect-error initializers must be callable
 define({},'bad',4);
// @ts-expect-error targets must be objects
 define(1,'bad',()=>4);
// @ts-expect-error inferred value is not a string
const text:string=target.value;
void [n,label,num,flag,text];
