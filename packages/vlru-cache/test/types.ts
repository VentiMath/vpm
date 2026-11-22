import {LRUCache} from "../index.cjs";
const cache:LRUCache<string,{text:string}>=new LRUCache<string,{text:string}>({maxSize:100,sizeCalculation:v=>v.text.length});
cache.set("key",{text:"value"});
const text:string|undefined=cache.get("key")?.text;
for(const [key,value]of cache){const name:string=key;const content:string=value.text;}
// @ts-expect-error Values must have the declared shape.
cache.set("wrong",3);

const options:LRUCache.Options<string,number>={max:4};
const numeric=new LRUCache(options);
