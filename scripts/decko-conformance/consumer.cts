import all, {bind, memoize, debounce} from 'vdecko';
const bound=bind(function(this:{id:string},n:number){return this.id+n},{id:'contest'});
const name:string=bound(2);
const cached=memoize((key:string,n:number)=>key+n,{caseSensitive:false,cache:{seed:'value'}});
const result:string=cached('contest',2);
const delayed=debounce(5,(n:number)=>n+1);
const nothing:void=delayed(2);
const d:TypedPropertyDescriptor<(n:number)=>number>={value:n=>n+1};
bind({},'bound',d);memoize()({},'memoized',d);all.debounce({delay:2})({},Symbol(),d);
// @ts-expect-error preserved arguments
cached(3,2);
// @ts-expect-error no value is returned before the timer fires
const invalid:number=delayed(1);
// @ts-expect-error options use the documented object form
memoize(false);
